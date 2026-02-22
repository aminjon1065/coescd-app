import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import { User } from '../../users/entities/user.entity';
import { GisLayer } from './gis-layer.entity';

export type GisFeatureSeverity = 'low' | 'medium' | 'high' | 'critical';
export type GisFeatureStatus = 'active' | 'resolved' | 'monitoring' | 'archived';

@Entity('gis_features')
export class GisFeature {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => GisLayer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'layer_id' })
  layer: GisLayer | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  // Full GeoJSON geometry (Point, Polygon, LineString, etc.) stored as jsonb
  @Column({ type: 'jsonb', nullable: true })
  geometry: object | null;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity: GisFeatureSeverity;

  @Column({
    type: 'enum',
    enum: ['active', 'resolved', 'monitoring', 'archived'],
    default: 'active',
  })
  status: GisFeatureStatus;

  // Extra arbitrary properties (colour, icon, metadata)
  @Column({ type: 'jsonb', nullable: true })
  properties: object | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
