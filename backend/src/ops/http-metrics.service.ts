import { Injectable } from '@nestjs/common';

type HttpEvent = {
  ts: number;
  error: boolean;
};

type RouteMetrics = {
  count: number;
  errors: number;
  totalDurationMs: number;
  maxDurationMs: number;
};

@Injectable()
export class HttpMetricsService {
  private readonly startedAt = Date.now();
  private readonly routeMetrics = new Map<string, RouteMetrics>();
  private readonly events: HttpEvent[] = [];
  private readonly maxEventHistory = 10000;

  observe(params: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
  }): void {
    const key = `${params.method.toUpperCase()} ${params.route}`;
    const current =
      this.routeMetrics.get(key) ??
      ({
        count: 0,
        errors: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
      } satisfies RouteMetrics);

    current.count += 1;
    if (params.statusCode >= 400) {
      current.errors += 1;
    }
    current.totalDurationMs += params.durationMs;
    current.maxDurationMs = Math.max(current.maxDurationMs, params.durationMs);
    this.routeMetrics.set(key, current);

    this.events.push({
      ts: Date.now(),
      error: params.statusCode >= 400,
    });
    if (this.events.length > this.maxEventHistory) {
      this.events.splice(0, this.events.length - this.maxEventHistory);
    }
  }

  snapshot(windowMinutes = 15) {
    const now = Date.now();
    const windowStart = now - windowMinutes * 60 * 1000;
    const recent = this.events.filter((event) => event.ts >= windowStart);

    const totalRequests = this.events.length;
    const totalErrors = this.events.reduce(
      (sum, event) => sum + (event.error ? 1 : 0),
      0,
    );
    const windowRequests = recent.length;
    const windowErrors = recent.reduce(
      (sum, event) => sum + (event.error ? 1 : 0),
      0,
    );

    const routes = Array.from(this.routeMetrics.entries())
      .map(([route, metrics]) => ({
        route,
        count: metrics.count,
        errors: metrics.errors,
        errorRate: metrics.count ? metrics.errors / metrics.count : 0,
        avgDurationMs: metrics.count
          ? Number((metrics.totalDurationMs / metrics.count).toFixed(2))
          : 0,
        maxDurationMs: Number(metrics.maxDurationMs.toFixed(2)),
      }))
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
      .slice(0, 20);

    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSeconds: Math.floor((now - this.startedAt) / 1000),
      totalRequests,
      totalErrors,
      totalErrorRate: totalRequests ? totalErrors / totalRequests : 0,
      windowMinutes,
      windowRequests,
      windowErrors,
      windowErrorRate: windowRequests ? windowErrors / windowRequests : 0,
      routes,
    };
  }
}

