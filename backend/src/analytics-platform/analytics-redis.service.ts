import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class AnalyticsRedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsRedisService.name);
  private client: Redis | null = null;
  private disabled = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('REDIS_DISABLED', 'false') === 'true') {
      this.disabled = true;
      return;
    }

    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.config.get<string>('REDIS_PORT', '6379')),
      db: Number(this.config.get<string>('REDIS_DB', '0')),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
    });

    try {
      await this.client.connect();
    } catch (err) {
      this.logger.warn('Analytics Redis unavailable; caching disabled', err);
      this.disabled = true;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }

  async get(key: string): Promise<string | null> {
    if (this.disabled || !this.client) return null;
    return this.client.get(key);
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    if (this.disabled || !this.client) return null;
    return this.client.getBuffer(key);
  }

  async setex(key: string, seconds: number, value: string | Buffer): Promise<void> {
    if (this.disabled || !this.client) return;
    await this.client.setex(key, seconds, value);
  }

  async del(...keys: string[]): Promise<void> {
    if (this.disabled || !this.client || keys.length === 0) return;
    await this.client.del(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.disabled || !this.client) return [];
    return this.client.keys(pattern);
  }
}
