import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../../users/enums/role.enum';
import { Permission, PermissionType } from '../permission.type';

@Entity('role_permission_profiles')
@Unique('UQ_ROLE_PERMISSION_PROFILE_ROLE', ['role'])
export class RolePermissionProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ enum: Role, type: 'varchar' })
  role: Role;

  @Column({ enum: Permission, type: 'json', default: [] })
  permissions: PermissionType[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
