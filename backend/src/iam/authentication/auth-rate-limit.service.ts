import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';

// ─── In-memory fallback types (used when REDIS_DISABLED=true) ────────────────

interface CounterState {
  timestamps: number[];
}

interface LockState {
  blockedUntil: number;
}

// ─── Lua script: atomic sliding-window counter ───────────────────────────────
//
// Adds the current request to a sorted set keyed by timestamp, evicts entries
// older than the window, then returns the count of remaining entries.
// A Lua script makes all three operations atomic — no race between the ZADD
// that records the attempt and the ZCARD that decides whether to block.
//
// KEYS[1]  — Redis key for this counter
// ARGV[1]  — current time in milliseconds (string)
// ARGV[2]  — window duration in milliseconds (string)
// ARGV[3]  — unique member id (prevents ZADD from de-duplicating same-ms calls)
const SLIDING_WINDOW_SCRIPT = `
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
local cutoff = now - window
redis.call('ZREMRANGEBYSCORE', key, '-inf', tostring(cutoff))
redis.call('ZADD', key, tostring(now), member)
redis.call('PEXPIRE', key, window)
return tonumber(redis.call('ZCARD', key))
`;

@Injectable()
export class AuthRateLimitService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AuthRateLimitService.name);

  // ── Config ────────────────────────────────────────────────────────────────
  private readonly signInMaxAttempts: number;
  private readonly signInWindowMs: number;
  private readonly lockoutMs: number;
  private readonly refreshMaxAttempts: number;
  private readonly refreshWindowMs: number;

  // ── Redis ─────────────────────────────────────────────────────────────────
  private redis: Redis | null = null;
  private useInMemory = false;

  // ── In-memory fallback (REDIS_DISABLED=true) ─────────────────────────────
  private readonly memSignInFailures = new Map<string, CounterState>();
  private readonly memRefreshAttempts = new Map<string, CounterState>();
  private readonly memLockouts = new Map<string, LockState>();

  constructor(private readonly configService: ConfigService) {
    this.signInMaxAttempts = Number(
      configService.get('AUTH_SIGNIN_MAX_ATTEMPTS', '5'),
    );
    this.signInWindowMs =
      Number(configService.get('AUTH_SIGNIN_WINDOW_SECONDS', '300')) * 1000;
    this.lockoutMs =
      Number(configService.get('AUTH_SIGNIN_LOCKOUT_SECONDS', '900')) * 1000;
    this.refreshMaxAttempts = Number(
      configService.get('AUTH_REFRESH_MAX_ATTEMPTS', '30'),
    );
    this.refreshWindowMs =
      Number(configService.get('AUTH_REFRESH_WINDOW_SECONDS', '60')) * 1000;
  }

  onApplicationBootstrap() {
    this.useInMemory =
      this.configService.get<string>('REDIS_DISABLED', 'false') === 'true';

    if (this.useInMemory) {
      this.logger.warn(
        'REDIS_DISABLED=true — AuthRateLimitService running in-memory ' +
          '(single-instance only; do not use in production)',
      );
      return;
    }

    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.configService.get<string>('REDIS_PORT', '6379')),
      db: Number(this.configService.get<string>('REDIS_DB', '0')),
      lazyConnect: false,
    });

    this.redis.on('error', (err) =>
      this.logger.error('Redis error in AuthRateLimitService', err),
    );
  }

  onApplicationShutdown() {
    return this.redis?.quit() ?? Promise.resolve();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Throws 429 if this email:ip pair is currently locked out.
   * Call before attempting authentication.
   */
  async assertSignInAllowed(email: string, ip: string): Promise<void> {
    if (this.useInMemory) {
      const lock = this.memLockouts.get(this.lockKey(email, ip));
      if (lock && lock.blockedUntil > Date.now()) {
        this.throwTooManyRequests('Too many login attempts');
      }
      return;
    }

    const locked = await this.redis!.get(this.lockKey(email, ip));
    if (locked) {
      this.throwTooManyRequests('Too many login attempts');
    }
  }

  /**
   * Records a failed sign-in attempt.  Acquires a Redis-backed lockout once
   * the failure threshold is exceeded within the sliding window.
   */
  async registerSignInFailure(email: string, ip: string): Promise<void> {
    const fk = this.failKey(email, ip);
    const lk = this.lockKey(email, ip);

    if (this.useInMemory) {
      const count = this.memIncrWindow(
        this.memSignInFailures,
        fk,
        this.signInWindowMs,
      );
      if (count >= this.signInMaxAttempts) {
        this.memLockouts.set(lk, { blockedUntil: Date.now() + this.lockoutMs });
        this.memSignInFailures.delete(fk);
      }
      return;
    }

    const count = await this.redisIncrWindow(fk, this.signInWindowMs);
    if (count >= this.signInMaxAttempts) {
      // SET NX EX — only writes if no lockout already exists (idempotent)
      await this.redis!.set(lk, '1', 'PX', this.lockoutMs, 'NX');
      await this.redis!.del(fk);
    }
  }

  /**
   * Clears the failure counter and any active lockout on successful sign-in.
   */
  async registerSignInSuccess(email: string, ip: string): Promise<void> {
    if (this.useInMemory) {
      this.memSignInFailures.delete(this.failKey(email, ip));
      this.memLockouts.delete(this.lockKey(email, ip));
      return;
    }

    // Variadic DEL — both keys in a single round-trip
    await this.redis!.del(this.failKey(email, ip), this.lockKey(email, ip));
  }

  /**
   * Throws 429 if this IP has exceeded the token-refresh rate limit.
   * Counter increments on every call (before the refresh is attempted).
   */
  async assertRefreshAllowed(ip: string): Promise<void> {
    const key = `auth:refresh:${ip}`;

    if (this.useInMemory) {
      const count = this.memIncrWindow(
        this.memRefreshAttempts,
        key,
        this.refreshWindowMs,
      );
      if (count > this.refreshMaxAttempts) {
        this.throwTooManyRequests('Too many refresh attempts');
      }
      return;
    }

    const count = await this.redisIncrWindow(key, this.refreshWindowMs);
    if (count > this.refreshMaxAttempts) {
      this.throwTooManyRequests('Too many refresh attempts');
    }
  }

  // ── Redis helpers ─────────────────────────────────────────────────────────

  /**
   * Executes the sliding-window Lua script atomically and returns the updated
   * request count within the window.
   */
  private async redisIncrWindow(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    // Unique member prevents ZADD from treating same-millisecond calls as
    // identical and collapsing them into a single entry.
    const member = `${now}:${randomBytes(4).toString('hex')}`;
    const result = await this.redis!.eval(
      SLIDING_WINDOW_SCRIPT,
      1,       // numkeys
      key,
      String(now),
      String(windowMs),
      member,
    );
    return result as number;
  }

  // ── In-memory helpers ─────────────────────────────────────────────────────

  private memIncrWindow(
    store: Map<string, CounterState>,
    key: string,
    windowMs: number,
  ): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    const state = store.get(key) ?? { timestamps: [] };
    state.timestamps = state.timestamps.filter((ts) => ts >= cutoff);
    state.timestamps.push(now);
    store.set(key, state);
    return state.timestamps.length;
  }

  // ── Key helpers ───────────────────────────────────────────────────────────

  private failKey(email: string, ip: string): string {
    return `auth:fail:${email.toLowerCase()}:${ip}`;
  }

  private lockKey(email: string, ip: string): string {
    return `auth:lock:${email.toLowerCase()}:${ip}`;
  }

  private throwTooManyRequests(message: string): never {
    throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
