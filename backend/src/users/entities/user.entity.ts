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

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  email: string;
  @Column()
  password: string;
  @Column()
  name: string;
  @Column({ nullable: true })
  position: string;
  @Column({ default: false })
  isVerified: boolean;
  @Column({ enum: Role, default: Role.Regular })
  role: Role;
  @Column({ enum: Permission, default: [], type: 'json' })
  permissions: PermissionType[];
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
