import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Permission, PermissionType } from '../permission.type';

@Entity('permission_profiles')
@Unique('UQ_PERMISSION_PROFILES_CODE', ['code'])
export class PermissionProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ enum: Permission, type: 'jsonb', default: [] })
  permissions: PermissionType[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
