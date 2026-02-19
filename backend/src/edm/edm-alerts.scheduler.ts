import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EdmService } from './edm.service';

const EDM_ALERTS_CRON_JOB = 'edm-alerts-process';

@Injectable()
export class EdmAlertsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EdmAlertsScheduler.name);
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly edmService: EdmService,
  ) {}

  onModuleInit() {
    const enabled =
      this.configService.get<string>('EDM_ALERTS_SCHEDULER_ENABLED', 'true') !==
      'false';
    if (!enabled) {
      this.logger.log('EDM alerts scheduler is disabled by config');
      return;
    }

    const cronExpression = this.configService.get<string>(
      'EDM_ALERTS_CRON',
      '*/10 * * * *',
    );

    const job = new CronJob(cronExpression, () => {
      void this.runTick();
    });
    this.schedulerRegistry.addCronJob(EDM_ALERTS_CRON_JOB, job);
    job.start();

    const runOnStartup =
      this.configService.get<string>('EDM_ALERTS_RUN_ON_STARTUP', 'false') ===
      'true';
    if (runOnStartup) {
      void this.runTick();
    }

    this.logger.log(
      `EDM alerts scheduler started (cron="${cronExpression}", runOnStartup=${runOnStartup})`,
    );
  }

  onModuleDestroy() {
    if (!this.schedulerRegistry.doesExist('cron', EDM_ALERTS_CRON_JOB)) {
      return;
    }
    const job = this.schedulerRegistry.getCronJob(EDM_ALERTS_CRON_JOB);
    job.stop();
    this.schedulerRegistry.deleteCronJob(EDM_ALERTS_CRON_JOB);
  }

  private async runTick() {
    if (this.isRunning) {
      this.logger.warn(
        'EDM alerts tick skipped because previous run is still in progress',
      );
      return;
    }
    this.isRunning = true;

    try {
      const result = await this.edmService.processDeadlineAlertsBySystem();
      this.logger.log(
        `EDM alerts tick finished: processedStages=${result.processedStages}, createdAlerts=${result.createdAlerts}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(`EDM alerts tick failed: ${message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
