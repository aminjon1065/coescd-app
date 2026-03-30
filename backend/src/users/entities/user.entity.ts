import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsOptional } from 'class-validator';
import { Role } from '../enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';
import type { PermissionType } from '../../iam/authorization/permission.type';
import { Department } from '../../department/entities/department.entity';
import { OrgUnit } from '../../iam/entities/org-unit.entity';
import { type Relation } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  email: string;
  @Column()
  password: string;
  @Column({ nullable: true, type: 'varchar' })
  @IsOptional()
  avatar: string | null;
  @Column()
  name: string;
  @Column({ nullable: true, type: 'varchar' })
  position: string | null;
  @Column({ default: false })
  isVerified: boolean;
  @Column({ default: true })
  isActive: boolean;
  @Column({ enum: Role, default: Role.Regular })
  role: Role;
  @Column({ enum: Permission, default: [], type: 'json' })
  permissions: PermissionType[];
  @Column({ name: 'business_role', type: 'varchar', nullable: true })
  @IsOptional()
  businessRole: string | null;
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Relation<Department> | null;
  @ManyToOne(() => OrgUnit, { nullable: true })
  @JoinColumn({ name: 'org_unit_id' })
  orgUnit: Relation<OrgUnit> | null;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
