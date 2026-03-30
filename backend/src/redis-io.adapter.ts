import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter backed by Redis pub/sub.
 *
 * Replaces the default in-process adapter so that events emitted to a room
 * on instance A are automatically relayed to clients connected to instance B
 * (or C, D …).  Without this, horizontal scaling breaks: a call:accepted
 * event emitted by instance A would never reach the caller connected to B.
 *
 * Uses two ioredis connections — one for PUBLISH, one for SUBSCRIBE.
 * Redis's SUBSCRIBE command puts the connection into a read-only mode,
 * so publishing from the same client is not possible.
 *
 * When REDIS_DISABLED=true (local development), this adapter is bypassed
 * entirely and NestJS falls back to its default in-memory IoAdapter.
 *
 * Lifecycle:
 *   1. main.ts creates an instance and calls `connectToRedis()`
 *   2. main.ts calls `app.useWebSocketAdapter(adapter)`
 *   3. On shutdown, `app.close()` triggers `onApplicationShutdown()` which
 *      quits both Redis connections cleanly.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);

  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(private readonly app: INestApplication) {
    super(app);
  }

  /**
   * Open two Redis connections and prepare the adapter factory.
   * Call this once before `app.useWebSocketAdapter(this)`.
   * When REDIS_DISABLED=true the method is a no-op and the adapter silently
   * reverts to the built-in in-process behaviour.
   */
  async connectToRedis(): Promise<void> {
    const config = this.app.get(ConfigService);

    if (config.get<string>('REDIS_DISABLED', 'false') === 'true') {
      this.logger.warn(
        'REDIS_DISABLED=true — RedisIoAdapter bypassed; ' +
          'WebSocket events will NOT propagate across multiple instances',
      );
      return;
    }

    const host = config.get<string>('REDIS_HOST', 'localhost');
    const port = Number(config.get<string>('REDIS_PORT', '6379'));
    const db = Number(config.get<string>('REDIS_DB', '0'));
    const password = config.get<string>('REDIS_PASSWORD');

    this.pubClient = new Redis({
      host,
      port,
      db,
      password: password || undefined,
      lazyConnect: false,
    });
    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (err) =>
      this.logger.error('[pub] Redis error', err),
    );
    this.subClient.on('error', (err) =>
      this.logger.error('[sub] Redis error', err),
    );

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log(`Redis adapter connected → ${host}:${port} db=${db}`);
  }

  /**
   * Called by NestJS for every Socket.IO namespace.
   * Applies the Redis adapter if one was created; otherwise falls through to
   * the in-process default.
   */
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }

  /**
   * Gracefully close both Redis connections.
   * Called manually from the shutdown hook in main.ts.
   */
  async onShutdown(): Promise<void> {
    await Promise.all([
      this.pubClient?.quit(),
      this.subClient?.quit(),
    ]);
    this.logger.log('Redis adapter connections closed');
  }
}
