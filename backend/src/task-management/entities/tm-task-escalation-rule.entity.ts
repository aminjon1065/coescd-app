import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { type Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { TaskPriority } from '../enums/task.enums';

export type EscalationTriggerType = 'overdue' | 'idle' | 'blocked' | 'sla_breach';
export type EscalationTarget = 'supervisor' | 'department_head' | 'specific_user' | 'role';

@Entity('tm_task_escalation_rules')
export class TmTaskEscalationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'trigger_type', type: 'varchar', length: 30 })
  triggerType: EscalationTriggerType;

  @Column({ name: 'trigger_hours', type: 'int' })
  triggerHours: number;

  @Column({ name: 'priority_filter', type: 'varchar', length: 20, nullable: true, default: null })
  priorityFilter: TaskPriority | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'department_id' })
  department: Relation<Department> | null;

  @Column({ name: 'escalate_to', type: 'varchar', length: 30 })
  escalateTo: EscalationTarget;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'escalate_to_user_id' })
  escalateToUser: Relation<User> | null;

  @Column({ name: 'escalate_to_role', type: 'varchar', length: 100, nullable: true, default: null })
  escalateToRole: string | null;

  @Column({ name: 'notification_channels', type: 'text', array: true, default: ['in_app', 'websocket'] })
  notificationChannels: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
