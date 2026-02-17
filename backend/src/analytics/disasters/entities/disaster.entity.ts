import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DisasterType } from '../../disasterTypes/entities/disaster-type.entity';
import { Department } from '../../../department/entities/department.entity';

export type DisasterSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DisasterStatus = 'active' | 'resolved' | 'monitoring';

@Entity('disasters')
export class Disaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  location: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity: DisasterSeverity;

  @Column({
    type: 'enum',
    enum: ['active', 'resolved', 'monitoring'],
    default: 'active',
  })
  status: DisasterStatus;

  @ManyToOne(() => DisasterType, { nullable: true })
  @JoinColumn({ name: 'type_id' })
  type: DisasterType;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ default: 0 })
  casualties: number;

  @Column({ name: 'affected_people', default: 0 })
  affectedPeople: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
