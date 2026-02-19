import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthAuditLog } from '../iam/authentication/entities/auth-audit-log.entity';
import { HttpMetricsService } from './http-metrics.service';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { OpsService } from './ops.service';
import { OpsController } from './ops.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuthAuditLog])],
  controllers: [OpsController],
  providers: [
    HttpMetricsService,
    OpsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
  exports: [HttpMetricsService],
})
export class OpsModule {}
