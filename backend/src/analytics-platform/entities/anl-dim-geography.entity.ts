import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_dim_geography')
export class AnlDimGeography {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ name: 'name_ru' })
  nameRu: string;

  @Column({ name: 'name_ky', nullable: true })
  nameKy: string;

  @Column()
  level: string;

  @Column({ name: 'parent_code', nullable: true })
  parentCode: string;

  @Column({ nullable: true })
  population: number;

  @Column({ name: 'area_km2', type: 'numeric', precision: 12, scale: 2, nullable: true })
  areaKm2: number;

  @Column({ type: 'geometry', spatialFeatureType: 'MultiPolygon', srid: 4326, nullable: true })
  boundary: string;
}
