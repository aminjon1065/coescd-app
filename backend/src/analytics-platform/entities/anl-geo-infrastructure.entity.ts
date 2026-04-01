import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_geo_infrastructure')
export class AnlGeoInfrastructure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'infra_type' })
  infraType: string;

  @Column({ default: 'operational' })
  status: string;

  @Column({ nullable: true })
  capacity: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: string;

  @Column({ type: 'jsonb', default: '{}' })
  properties: Record<string, unknown>;
}
