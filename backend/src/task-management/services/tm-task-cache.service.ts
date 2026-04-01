import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin Redis cache wrapper for the task-management module.
 *
 * Key namespaces
 * ──────────────
 *   tm:task:{id}          → full task detail (TTL: 30 s)
 *   tm:board:{id}         → board + tasksByColumn snapshot (TTL: 20 s)
 *   tm:report:workload    → workload report (TTL: 2 min)
 *   tm:report:dept        → department overview (TTL: 2 min)
 *   tm:report:sla         → SLA compliance (TTL: 2 min)
 *   tm:report:metrics     → completion metrics (TTL: 5 min)
 *
 * All TTLs are configurable via env vars so ops can tune them without a deploy.
 * Falls back to a no-op when REDIS_DISABLED=true.
 */
@Injectable()
export class TmTaskCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TmTaskCacheService.name);
  private client: Redis | null = null;
  private disabled = false;

  // TTLs (seconds)
  readonly TASK_TTL: number;
  readonly BOARD_TTL: number;
  readonly REPORT_TTL: number;
  readonly METRICS_TTL: number;

  constructor(private readonly config: ConfigService) {
    this.TASK_TTL    = Number(config.get('TM_CACHE_TASK_TTL',    '30'));
    this.BOARD_TTL   = Number(config.get('TM_CACHE_BOARD_TTL',   '20'));
    this.REPORT_TTL  = Number(config.get('TM_CACHE_REPORT_TTL',  '120'));
    this.METRICS_TTL = Number(config.get('TM_CACHE_METRICS_TTL', '300'));
  }

  async onModuleInit() {
    if (this.config.get<string>('REDIS_DISABLED', 'false') === 'true') {
      this.disabled = true;
      this.logger.log('TmTaskCacheService: Redis disabled — cache is a no-op');
      return;
    }

    this.client = new Redis({
      host:     this.config.get<string>('REDIS_HOST', 'localhost'),
      port:     Number(this.config.get<string>('REDIS_PORT', '6379')),
      db:       Number(this.config.get<string>('REDIS_DB', '0')),
      password: this.config.get<string>('REDIS_PASSWORD'),
      lazyConnect: true,
    });

    try {
      await this.client.connect();
      this.logger.log('TmTaskCacheService connected to Redis');
    } catch (err) {
      // Cache is best-effort — log and carry on without it
      this.logger.warn('TmTaskCacheService: could not connect to Redis; cache disabled', err);
      this.disabled = true;
    }
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  // ─── Primitives ─────────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    if (this.disabled || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`Cache GET error [${key}]`, err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (this.disabled || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache SET error [${key}]`, err);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (this.disabled || !this.client || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (err) {
      this.logger.warn(`Cache DEL error [${keys.join(', ')}]`, err);
    }
  }

  /** Delete all keys matching a glob pattern (e.g. "tm:report:*"). */
  async delPattern(pattern: string): Promise<void> {
    if (this.disabled || !this.client) return;
    try {
      // SCAN is non-blocking unlike KEYS
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        if (keys.length) await this.client.del(...keys);
        cursor = next;
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`Cache SCAN/DEL error [${pattern}]`, err);
    }
  }

  // ─── Typed helpers ───────────────────────────────────────────────────────────

  taskKey    = (id: string)  => `tm:task:${id}`;
  boardKey   = (id: string)  => `tm:board:${id}`;
  reportKey  = (name: string) => `tm:report:${name}`;

  async invalidateTask(taskId: string): Promise<void> {
    await this.del(this.taskKey(taskId));
  }

  async invalidateBoard(boardId: string): Promise<void> {
    await this.del(this.boardKey(boardId));
  }

  async invalidateReports(): Promise<void> {
    await this.delPattern('tm:report:*');
  }
}
