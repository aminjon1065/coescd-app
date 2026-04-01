import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_fact_seismic')
export class AnlFactSeismic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  magnitude: number;

  @Column({ name: 'depth_km', type: 'numeric', precision: 7, scale: 2, nullable: true })
  depthKm: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  epicenter: string;

  @Column({ name: 'geo_code', nullable: true })
  geoCode: string;

  @Column({ name: 'intensity_msk', type: 'numeric', precision: 4, scale: 2, nullable: true })
  intensityMsk: number;

  @Column({ nullable: true })
  source: string;

  @Column({ name: 'raw_json', type: 'jsonb', nullable: true })
  rawJson: Record<string, unknown>;
}
