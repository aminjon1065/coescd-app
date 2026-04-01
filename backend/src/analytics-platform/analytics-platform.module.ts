import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import {
  AnlFactIncident, AnlFactWeather, AnlFactSeismic, AnlFactResourceDeployment,
  AnlKpiSnapshot, AnlKpiDefinition,
  AnlDimGeography, AnlDimIncidentType, AnlDimResource, AnlDimDataset,
  AnlGeoBoundary, AnlGeoRiskZone, AnlGeoInfrastructure, AnlGeoEventLayer,
  AnlDashboard, AnlDataSource, AnlPipelineRun, AnlReport, AnlAccessPolicy,
  AnlRawIngestionLog,
} from './entities';

// Services & Controllers
import { KpiService } from './kpi/kpi.service';
import { KpiController } from './kpi/kpi.controller';
import { GeoService } from './geo/geo.service';
import { TileService } from './geo/tile.service';
import { GeoController } from './geo/geo.controller';
import { PipelineSchedulerService } from './pipeline/pipeline-scheduler.service';
import { PipelineController } from './pipeline/pipeline.controller';
import { RiskEnricherService } from './pipeline/transformers/risk-enricher.service';
import { InternalSyncProcessor } from './ingestion/processors/internal-sync.processor';
import { AggregationProcessor } from './ingestion/processors/aggregation.processor';
import { DatasetsService } from './datasets/datasets.service';
import { DatasetsController } from './datasets/datasets.controller';
import { DashboardsService } from './dashboards/dashboards.service';
import { DashboardsController } from './dashboards/dashboards.controller';
import { ExplorerService } from './explorer/explorer.service';
import { ExplorerController } from './explorer/explorer.controller';
import { ReportsService } from './reports/reports.service';
import { ReportsController } from './reports/reports.controller';
import { AnalyticsGateway } from './gateways/analytics.gateway';

const ENTITIES = [
  AnlFactIncident, AnlFactWeather, AnlFactSeismic, AnlFactResourceDeployment,
  AnlKpiSnapshot, AnlKpiDefinition,
  AnlDimGeography, AnlDimIncidentType, AnlDimResource, AnlDimDataset,
  AnlGeoBoundary, AnlGeoRiskZone, AnlGeoInfrastructure, AnlGeoEventLayer,
  AnlDashboard, AnlDataSource, AnlPipelineRun, AnlReport, AnlAccessPolicy,
  AnlRawIngestionLog,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(ENTITIES),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
          password: cfg.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'ingestion' },
      { name: 'pipeline' },
      { name: 'aggregation' },
      { name: 'export' },
    ),
  ],
  controllers: [
    KpiController,
    GeoController,
    PipelineController,
    DatasetsController,
    DashboardsController,
    ExplorerController,
    ReportsController,
  ],
  providers: [
    KpiService,
    GeoService,
    TileService,
    PipelineSchedulerService,
    RiskEnricherService,
    InternalSyncProcessor,
    AggregationProcessor,
    DatasetsService,
    DashboardsService,
    ExplorerService,
    ReportsService,
    AnalyticsGateway,
  ],
  exports: [KpiService, GeoService, AnalyticsGateway],
})
export class AnalyticsPlatformModule {}
