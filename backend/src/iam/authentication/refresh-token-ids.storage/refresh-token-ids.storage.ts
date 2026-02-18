import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import jwtConfig from '../../config/jwt.config';
import { ConfigType } from '@nestjs/config';

export class InValidatedRefreshTokenError extends Error {}

@Injectable()
export class RefreshTokenIdsStorage
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private redisClient?: Redis;
  private readonly fallbackStore = new Map<string, string>();
  private useInMemoryStore = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

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

  onApplicationShutdown(signal?: string) {
    if (this.redisClient) {
      return this.redisClient.quit();
    }
    return Promise.resolve();
  }

  async insert(userId: number, tokenId: string): Promise<void> {
    const key = this.getKey(userId);
    if (this.useInMemoryStore) {
      this.fallbackStore.set(key, tokenId);
      return;
    }
    const ttl = this.jwtConfiguration.refreshTokenTtl;
    await this.redisClient?.set(key, tokenId, 'EX', ttl);
  }

  async validate(userId: number, tokenId: string): Promise<boolean> {
    const key = this.getKey(userId);
    const storeId = this.useInMemoryStore
      ? this.fallbackStore.get(key)
      : await this.redisClient?.get(key);
    if (storeId !== tokenId) {
      throw new InValidatedRefreshTokenError();
    }
    return storeId === tokenId;
  }

  async invalidate(userId: number): Promise<void> {
    const key = this.getKey(userId);
    if (this.useInMemoryStore) {
      this.fallbackStore.delete(key);
      return;
    }
    await this.redisClient?.del(key);
  }

  private getKey(userId: number): string {
    return `refresh-token-id:${userId}`;
  }
}
