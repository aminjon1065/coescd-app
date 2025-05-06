import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DepartmentEnum } from '../enums/department.enum';
import { IsOptional } from 'class-validator';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: DepartmentEnum })
  type: DepartmentEnum;

  @ManyToOne(() => Department, (department) => department.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  @IsOptional()
  parent: Department | null;

  @OneToMany(() => Department, (department) => department.parent)
  children: Department[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'chief_id' })
  @IsOptional()
  chief: User | null;

  @OneToMany(() => User, (user) => user.department)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
