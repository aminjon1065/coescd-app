import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { type Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { TmTask } from './tm-task.entity';

@Entity('tm_task_assignments')
export class TmTaskAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TmTask, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Relation<TmTask>;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser: Relation<User> | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_department_id' })
  assignedToDepartment: Relation<Department> | null;

  @Column({ name: 'assigned_to_role', type: 'varchar', length: 100, nullable: true, default: null })
  assignedToRole: string | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: Relation<User>;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;

  @Column({ name: 'response_deadline', type: 'timestamptz', nullable: true, default: null })
  responseDeadline: Date | null;

  @ManyToOne(() => TmTaskAssignment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delegated_from_id' })
  delegatedFrom: Relation<TmTaskAssignment> | null;
}
