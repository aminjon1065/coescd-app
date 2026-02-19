import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { AuthAuditLog } from '../iam/authentication/entities/auth-audit-log.entity';
import { HttpMetricsService } from './http-metrics.service';

@Injectable()
export class OpsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly httpMetricsService: HttpMetricsService,
    @InjectRepository(AuthAuditLog)
    private readonly authAuditRepository: Repository<AuthAuditLog>,
  ) {}

  getLiveness() {
    return {
      status: 'ok',
      service: 'backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async getReadiness() {
    let dbOk = false;
    try {
      await this.dataSource.query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const schedulerEnabled =
      this.configService.get<string>('EDM_ALERTS_SCHEDULER_ENABLED', 'true') !==
      'false';

    const ready = dbOk;
    const payload = {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        db: dbOk ? 'ok' : 'fail',
        edmAlertsScheduler: schedulerEnabled ? 'enabled' : 'disabled',
      },
    };

    if (!ready) {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }

  async getMetrics(params: {
    windowMinutes?: number;
    authFailureThreshold?: number;
  }) {
    const windowMinutes = params.windowMinutes ?? 15;
    const authFailureThreshold =
      params.authFailureThreshold ??
      Number(process.env.AUTH_FAILURE_SPIKE_THRESHOLD ?? 20);

    const http = this.httpMetricsService.snapshot(windowMinutes);
    const auth = await this.getAuthFailureMetrics(
      windowMinutes,
      authFailureThreshold,
    );
    const processMetrics = this.getProcessMetrics();
    const httpErrorRateThreshold = Number(
      this.configService.get<string>('HTTP_WINDOW_ERROR_RATE_THRESHOLD', '0.2'),
    );
    const httpMinRequests = Number(
      this.configService.get<string>('HTTP_WINDOW_MIN_REQUESTS', '20'),
    );
    const heapWarnMb = Number(
      this.configService.get<string>('PROCESS_HEAP_WARN_MB', '512'),
    );

    return {
      generatedAt: new Date().toISOString(),
      windowMinutes,
      http,
      auth,
      process: processMetrics,
      alerts: {
        authFailureSpike: {
          threshold: authFailureThreshold,
          observed: auth.failures,
          triggered: auth.failures >= authFailureThreshold,
        },
        httpErrorRateSpike: {
          threshold: httpErrorRateThreshold,
          minRequests: httpMinRequests,
          observedRate: Number(http.windowErrorRate.toFixed(4)),
          observedRequests: http.windowRequests,
          triggered:
            http.windowRequests >= httpMinRequests &&
            http.windowErrorRate >= httpErrorRateThreshold,
        },
        highHeapUsage: {
          thresholdMb: heapWarnMb,
          observedMb: processMetrics.heapUsedMb,
          triggered: processMetrics.heapUsedMb >= heapWarnMb,
        },
      },
    };
  }

  getBackupStatus() {
    const required =
      this.configService.get<string>('BACKUP_REQUIRED', 'true') !== 'false';
    const maxAgeHours = Number(
      this.configService.get<string>('BACKUP_MAX_AGE_HOURS', '26'),
    );
    const lastSuccessAtRaw = this.configService.get<string>(
      'BACKUP_LAST_SUCCESS_AT',
      '',
    );
    const now = Date.now();
    const parsedTs = lastSuccessAtRaw ? Date.parse(lastSuccessAtRaw) : NaN;
    const hasValidTimestamp = Number.isFinite(parsedTs);
    const ageHours = hasValidTimestamp
      ? Number(((now - parsedTs) / (1000 * 60 * 60)).toFixed(2))
      : null;
    const stale = hasValidTimestamp ? (ageHours ?? 0) > maxAgeHours : true;
    const triggered = required && (!hasValidTimestamp || stale);

    return {
      generatedAt: new Date().toISOString(),
      required,
      maxAgeHours,
      lastSuccessAt: hasValidTimestamp
        ? new Date(parsedTs).toISOString()
        : null,
      ageHours,
      stale,
      alertTriggered: triggered,
    };
  }

  private async getAuthFailureMetrics(
    windowMinutes: number,
    threshold: number,
  ) {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const [failures, total] = await Promise.all([
      this.authAuditRepository
        .createQueryBuilder('audit')
        .where('audit.created_at >= :since', { since })
        .andWhere('audit.success = :success', { success: false })
        .getCount(),
      this.authAuditRepository
        .createQueryBuilder('audit')
        .where('audit.created_at >= :since', { since })
        .getCount(),
    ]);

    return {
      windowMinutes,
      failures,
      totalEvents: total,
      failureRate: total ? failures / total : 0,
      threshold,
    };
  }

  private getProcessMetrics() {
    const memory = process.memoryUsage();
    return {
      pid: process.pid,
      heapUsedMb: Number((memory.heapUsed / (1024 * 1024)).toFixed(2)),
      heapTotalMb: Number((memory.heapTotal / (1024 * 1024)).toFixed(2)),
      rssMb: Number((memory.rss / (1024 * 1024)).toFixed(2)),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
