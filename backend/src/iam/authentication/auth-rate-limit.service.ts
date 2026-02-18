import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface CounterState {
  timestamps: number[];
}

interface LockState {
  blockedUntil: number;
}

@Injectable()
export class AuthRateLimitService {
  private readonly signInFailures = new Map<string, CounterState>();
  private readonly refreshAttempts = new Map<string, CounterState>();
  private readonly lockouts = new Map<string, LockState>();

  private readonly signInMaxAttempts = Number(
    process.env.AUTH_SIGNIN_MAX_ATTEMPTS ?? '5',
  );
  private readonly signInWindowMs =
    Number(process.env.AUTH_SIGNIN_WINDOW_SECONDS ?? '300') * 1000;
  private readonly lockoutMs =
    Number(process.env.AUTH_SIGNIN_LOCKOUT_SECONDS ?? '900') * 1000;
  private readonly refreshMaxAttempts = Number(
    process.env.AUTH_REFRESH_MAX_ATTEMPTS ?? '30',
  );
  private readonly refreshWindowMs =
    Number(process.env.AUTH_REFRESH_WINDOW_SECONDS ?? '60') * 1000;

  assertSignInAllowed(email: string, ip: string): void {
    const key = this.getPrincipalKey(email, ip);
    const lock = this.lockouts.get(key);
    if (lock && lock.blockedUntil > Date.now()) {
      this.throwTooManyRequests('Too many login attempts');
    }
  }

  registerSignInFailure(email: string, ip: string): void {
    const key = this.getPrincipalKey(email, ip);
    const count = this.incrementInWindow(
      this.signInFailures,
      key,
      this.signInWindowMs,
    );
    if (count >= this.signInMaxAttempts) {
      this.lockouts.set(key, { blockedUntil: Date.now() + this.lockoutMs });
      this.signInFailures.delete(key);
    }
  }

  registerSignInSuccess(email: string, ip: string): void {
    const key = this.getPrincipalKey(email, ip);
    this.signInFailures.delete(key);
    this.lockouts.delete(key);
  }

  assertRefreshAllowed(ip: string): void {
    const count = this.incrementInWindow(
      this.refreshAttempts,
      `refresh:${ip}`,
      this.refreshWindowMs,
    );
    if (count > this.refreshMaxAttempts) {
      this.throwTooManyRequests('Too many refresh attempts');
    }
  }

  private incrementInWindow(
    storage: Map<string, CounterState>,
    key: string,
    windowMs: number,
  ): number {
    const now = Date.now();
    const minTs = now - windowMs;
    const state = storage.get(key) ?? { timestamps: [] };
    state.timestamps = state.timestamps.filter((ts) => ts >= minTs);
    state.timestamps.push(now);
    storage.set(key, state);
    return state.timestamps.length;
  }

  private getPrincipalKey(email: string, ip: string): string {
    return `${email.toLowerCase()}:${ip}`;
  }

  private throwTooManyRequests(message: string): never {
    throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
