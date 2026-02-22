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
import {
  Permission,
  PermissionType,
} from '../../iam/authorization/permission.type';
import { Department } from '../../department/entities/department.entity';
import { OrgUnit } from '../../iam/entities/org-unit.entity';

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
  @Column({ name: 'org_unit_id', type: 'int', nullable: true })
  @IsOptional()
  orgUnitId: number | null;
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;
  @ManyToOne(() => OrgUnit, { nullable: true })
  @JoinColumn({ name: 'org_unit_id' })
  orgUnit: OrgUnit | null;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
