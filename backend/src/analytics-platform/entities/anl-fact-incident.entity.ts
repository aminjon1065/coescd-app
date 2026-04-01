import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_fact_incidents')
export class AnlFactIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ name: 'geo_code', nullable: true })
  geoCode: string;

  @Column({ name: 'incident_type_id', nullable: true })
  incidentTypeId: number;

  @Column({ type: 'smallint', default: 1 })
  severity: number;

  @Column({ name: 'affected_count', default: 0 })
  affectedCount: number;

  @Column({ default: 0 })
  fatalities: number;

  @Column({ default: 0 })
  injuries: number;

  @Column({ name: 'economic_loss_usd', type: 'numeric', precision: 15, scale: 2, nullable: true })
  economicLossUsd: number;

  @Column({ name: 'response_time_min', nullable: true })
  responseTimeMin: number;

  @Column({ name: 'resolution_time_min', nullable: true })
  resolutionTimeMin: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location: string;

  @Column({ name: 'source_doc_id', type: 'uuid', nullable: true })
  sourceDocId: string;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, unknown>;
}
