import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BusinessRoleEntity } from './business-role.entity';
import { PermissionProfile } from './permission-profile.entity';

@Entity('business_role_permission_profiles')
@Unique('UQ_BUSINESS_ROLE_PERMISSION_PROFILE_PAIR', [
  'businessRole',
  'permissionProfile',
])
export class BusinessRolePermissionProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BusinessRoleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_role_id' })
  businessRole: BusinessRoleEntity;

  @ManyToOne(() => PermissionProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_profile_id' })
  permissionProfile: PermissionProfile;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

export { BusinessRolePermissionProfile as BusinessRolePermissionProfileEntity };
