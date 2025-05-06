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

export type DepartmentType = 'main' | 'management' | 'division' | 'section';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['main', 'management', 'division', 'section'] })
  type: DepartmentType;

  @ManyToOne(() => Department, (department) => department.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Department;

  @OneToMany(() => Department, (department) => department.parent)
  children: Department[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'chief_id' })
  chief: User;

  @OneToMany(() => User, (user) => user.department)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
