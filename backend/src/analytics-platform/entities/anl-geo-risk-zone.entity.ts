import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_geo_risk_zones')
export class AnlGeoRiskZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'risk_type' })
  riskType: string;

  @Column({ type: 'smallint' })
  severity: number;

  @Column({ type: 'geometry', spatialFeatureType: 'MultiPolygon', srid: 4326 })
  geometry: string;

  @Column({ name: 'population_at_risk', nullable: true })
  populationAtRisk: number;

  @Column({ name: 'last_assessed', type: 'timestamptz', nullable: true })
  lastAssessed: Date;

  @Column({ name: 'valid_from', type: 'timestamptz', nullable: true })
  validFrom: Date;

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil: Date;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'jsonb', default: '{}' })
  properties: Record<string, unknown>;
}
