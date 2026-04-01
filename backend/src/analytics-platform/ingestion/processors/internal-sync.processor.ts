import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnlRawIngestionLog } from '../../entities/anl-raw-ingestion-log.entity';
import { randomUUID } from 'crypto';

@Processor('ingestion')
export class InternalSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(InternalSyncProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AnlRawIngestionLog)
    private readonly logRepo: Repository<AnlRawIngestionLog>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'sync_edm_incidents') {
      await this.syncEdmIncidents();
    } else if (job.name === 'fetch_weather') {
      await this.fetchWeather();
    } else if (job.name === 'fetch_seismic') {
      await this.fetchSeismic();
    }
  }

  private async syncEdmIncidents() {
    this.logger.log('Syncing EDM incidents → anl_fact_incidents');
    const batchId = randomUUID();

    try {
      // Sync disasters table to fact_incidents
      const result = await this.dataSource.query(`
        INSERT INTO anl_fact_incidents (id, occurred_at, geo_code, severity, affected_count,
          fatalities, injuries, source_doc_id, raw_data)
        SELECT
          gen_random_uuid(),
          COALESCE(d.started_at, d.created_at),
          d.location_name,
          COALESCE(d.severity::smallint, 3),
          COALESCE(d.affected_people, 0),
          COALESCE(d.death_toll, 0),
          COALESCE(d.injured, 0),
          NULL,
          jsonb_build_object('source', 'disasters', 'disaster_id', d.id)
        FROM disasters d
        WHERE NOT EXISTS (
          SELECT 1 FROM anl_fact_incidents f
          WHERE f.raw_data->>'disaster_id' = d.id::text
        )
        LIMIT 500
      `);

      await this.logRepo.save({
        sourceType: 'internal_edm',
        sourceKey: 'disasters',
        batchId,
        rawPayload: { synced: true },
        rowCount: Array.isArray(result) ? result.length : 0,
        status: 'success',
        processedAt: new Date(),
      });
    } catch (err) {
      this.logger.error(`EDM sync failed: ${err.message}`);
      await this.logRepo.save({
        sourceType: 'internal_edm',
        sourceKey: 'disasters',
        batchId,
        rawPayload: {},
        status: 'failed',
        errorDetail: err.message,
      });
      throw err;
    }
  }

  private async fetchWeather() {
    // Stub — in production, call weather API and insert into anl_fact_weather
    this.logger.log('Weather fetch job executed (stub — configure API key)');
  }

  private async fetchSeismic() {
    // Stub — in production, call USGS feed and insert into anl_fact_seismic
    this.logger.log('Seismic fetch job executed (stub — configure USGS endpoint)');
  }
}
