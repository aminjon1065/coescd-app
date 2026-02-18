import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { BulkImportRowError, BulkImportSession } from './bulk-import.types';

type IdempotencyValue = {
  operationId: string;
  summary: Record<string, number>;
  failures: BulkImportRowError[];
};

@Injectable()
export class UsersBulkImportStorage
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private redisClient?: Redis;
  private useInMemoryStore = false;
  private readonly sessionsFallback = new Map<
    string,
    { value: BulkImportSession; expiresAt: number }
  >();
  private readonly idempotencyFallback = new Map<
    string,
    { value: IdempotencyValue; expiresAt: number }
  >();

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    this.useInMemoryStore =
      this.configService.get<string>('REDIS_DISABLED', 'false') === 'true';
    if (this.useInMemoryStore) {
      return;
    }
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.configService.get<string>('REDIS_PORT', '6379')),
      db: Number(this.configService.get<string>('REDIS_DB', '0')),
    });
  }

  onApplicationShutdown() {
    if (!this.redisClient) {
      return Promise.resolve();
    }
    return this.redisClient.quit();
  }

  async setSession(
    sessionId: string,
    session: BulkImportSession,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.getSessionKey(sessionId);
    if (this.useInMemoryStore) {
      this.sessionsFallback.set(key, {
        value: session,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return;
    }
    await this.redisClient?.set(key, JSON.stringify(session), 'EX', ttlSeconds);
  }

  async getSession(sessionId: string): Promise<BulkImportSession | null> {
    const key = this.getSessionKey(sessionId);
    if (this.useInMemoryStore) {
      const item = this.sessionsFallback.get(key);
      if (!item) {
        return null;
      }
      if (item.expiresAt <= Date.now()) {
        this.sessionsFallback.delete(key);
        return null;
      }
      return item.value;
    }
    const raw = await this.redisClient?.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as BulkImportSession;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    if (this.useInMemoryStore) {
      this.sessionsFallback.delete(key);
      return;
    }
    await this.redisClient?.del(key);
  }

  async getIdempotency(
    actorId: number,
    idempotencyKey: string,
  ): Promise<IdempotencyValue | null> {
    const key = this.getIdempotencyKey(actorId, idempotencyKey);
    if (this.useInMemoryStore) {
      const item = this.idempotencyFallback.get(key);
      if (!item) {
        return null;
      }
      if (item.expiresAt <= Date.now()) {
        this.idempotencyFallback.delete(key);
        return null;
      }
      return item.value;
    }
    const raw = await this.redisClient?.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as IdempotencyValue;
  }

  async setIdempotency(
    actorId: number,
    idempotencyKey: string,
    value: IdempotencyValue,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.getIdempotencyKey(actorId, idempotencyKey);
    if (this.useInMemoryStore) {
      this.idempotencyFallback.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return;
    }
    await this.redisClient?.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  private getSessionKey(sessionId: string): string {
    return `users-bulk-import:session:${sessionId}`;
  }

  private getIdempotencyKey(actorId: number, idempotencyKey: string): string {
    return `users-bulk-import:idempotency:${actorId}:${idempotencyKey}`;
  }
}
