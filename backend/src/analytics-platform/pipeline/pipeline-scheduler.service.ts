import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { KpiService } from '../kpi/kpi.service';
import { DataSource } from 'typeorm';

@Injectable()
export class PipelineSchedulerService {
  private readonly logger = new Logger(PipelineSchedulerService.name);

  constructor(
    @InjectQueue('ingestion') private readonly ingestionQueue: Queue,
    @InjectQueue('aggregation') private readonly aggregationQueue: Queue,
    private readonly kpiService: KpiService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('0 * * * *')
  async syncInternalData() {
    this.logger.log('Scheduling internal data sync');
    await this.ingestionQueue.add('sync_edm_incidents', {}, { attempts: 3, backoff: { type: 'exponential', delay: 60000 } });
  }

  @Cron('0 */3 * * *')
  async fetchExternalFeeds() {
    this.logger.log('Scheduling external feed fetch');
    await this.ingestionQueue.add('fetch_weather', {}, { attempts: 3 });
    await this.ingestionQueue.add('fetch_seismic', {}, { attempts: 3 });
  }

  @Cron('0 2 * * *')
  async refreshDailyAggs() {
    this.logger.log('Refreshing daily aggregations');
    await this.aggregationQueue.add('refresh_daily_agg', {}, { attempts: 2 });
  }

  @Cron('0 0 * * 1')
  async refreshWeeklyRisk() {
    this.logger.log('Refreshing weekly risk index');
    await this.aggregationQueue.add('refresh_weekly_risk', {}, { attempts: 2 });
  }

  @Cron('*/15 * * * *')
  async snapshotKpis() {
    try {
      await this.kpiService.snapshotAll();
    } catch (err) {
      this.logger.error('KPI snapshot failed', err);
    }
  }

  async triggerManual(queueName: string, jobName: string, data: Record<string, unknown> = {}) {
    const queue = queueName === 'ingestion' ? this.ingestionQueue : this.aggregationQueue;
    return queue.add(jobName, data, { attempts: 2 });
  }
}
