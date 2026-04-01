import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_geo_boundaries')
export class AnlGeoBoundary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  level: string;

  @Column({ name: 'name_ru' })
  nameRu: string;

  @Column({ name: 'name_ky', nullable: true })
  nameKy: string;

  @Column({ type: 'geometry', spatialFeatureType: 'MultiPolygon', srid: 4326 })
  boundary: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  centroid: string;

  @Column({ type: 'jsonb', default: '{}' })
  properties: Record<string, unknown>;
}
