import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { envValidationSchema } from './config/env.validation';
import { UsersModule } from './users/users.module';
import { IamModule } from './iam/iam.module';
import { DepartmentModule } from './department/department.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FilesModule } from './files/files.module';
import { OpsModule } from './ops/ops.module';
import { GisModule } from './gis/gis.module';
import { ChatModule } from './chat/chat.module';
import { CallsModule } from './calls/calls.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsPlatformModule } from './analytics-platform/analytics-platform.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EdmAlertsScheduler } from './edm/edm-alerts.scheduler';
import { DocumentsModule } from './modules/documents/documents.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        // Global default: 120 requests per minute per IP
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
      {
        // Stricter limit for heavy compute endpoints (reports, prediction)
        name: 'heavy',
        ttl: 60_000,
        limit: 10,
      },
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: Number(configService.get('DB_PORT')),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun:
          configService.get<string>('DB_MIGRATIONS_RUN', 'false') === 'true',
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    IamModule,
    DepartmentModule,
    TasksModule,
    AnalyticsModule,
    DocumentsModule,
    FilesModule,
    OpsModule,
    GisModule,
    ChatModule,
    CallsModule,
    NotificationsModule,
    AnalyticsPlatformModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EdmAlertsScheduler,
    // Apply throttling globally to all HTTP routes
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
