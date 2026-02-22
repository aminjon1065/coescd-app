import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { IamModule } from './iam/iam.module';
import { DepartmentModule } from './department/department.module';
import { TaskModule } from './task/task.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DocumentModule } from './document/document.module';
import { FilesModule } from './files/files.module';
import { OpsModule } from './ops/ops.module';
import { EdmModule } from './edm/edm.module';
import { GisModule } from './gis/gis.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EdmAlertsScheduler } from './edm/edm-alerts.scheduler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
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
    TaskModule,
    AnalyticsModule,
    DocumentModule,
    FilesModule,
    OpsModule,
    EdmModule,
    GisModule,
  ],
  controllers: [AppController],
  providers: [AppService, EdmAlertsScheduler],
})
export class AppModule {}
