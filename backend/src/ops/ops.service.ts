import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthAuditLog } from '../iam/authentication/entities/auth-audit-log.entity';
import { HttpMetricsService } from './http-metrics.service';

@Injectable()
export class OpsService {
  constructor(
    private readonly httpMetricsService: HttpMetricsService,
    @InjectRepository(AuthAuditLog)
    private readonly authAuditRepository: Repository<AuthAuditLog>,
  ) {}

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

    return {
      generatedAt: new Date().toISOString(),
      windowMinutes,
      http,
      auth,
      alerts: {
        authFailureSpike: {
          threshold: authFailureThreshold,
          observed: auth.failures,
          triggered: auth.failures >= authFailureThreshold,
        },
      },
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
}

