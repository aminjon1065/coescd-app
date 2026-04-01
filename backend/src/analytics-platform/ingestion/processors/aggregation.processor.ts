import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { KpiService } from '../../kpi/kpi.service';

@Processor('aggregation')
export class AggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(AggregationProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly kpiService: KpiService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'refresh_daily_agg') {
      await this.refreshDailyAgg();
    } else if (job.name === 'refresh_weekly_risk') {
      await this.refreshWeeklyRisk();
    } else if (job.name === 'snapshot_kpis') {
      await this.kpiService.snapshotAll();
    }
  }

  private async refreshDailyAgg() {
    this.logger.log('Refreshing daily aggregation materialized view');
    try {
      await this.dataSource.query(
        `REFRESH MATERIALIZED VIEW CONCURRENTLY anl_agg_incidents_daily`,
      );
      await this.kpiService.bustCache();
    } catch (err) {
      // View may not exist yet if migration hasn't run — log and continue
      this.logger.warn(`Daily agg refresh failed: ${err.message}`);
    }
  }

  private async refreshWeeklyRisk() {
    this.logger.log('Refreshing weekly risk index aggregation');
    try {
      await this.dataSource.query(
        `REFRESH MATERIALIZED VIEW CONCURRENTLY anl_agg_risk_index_weekly`,
      );
    } catch (err) {
      this.logger.warn(`Weekly risk refresh failed: ${err.message}`);
    }
  }
}
