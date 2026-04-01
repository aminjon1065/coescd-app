import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { type Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TmTask } from './tm-task.entity';
import { TaskHistoryAction } from '../enums/task.enums';

@Entity('tm_task_history')
export class TmTaskHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TmTask, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Relation<TmTask>;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id' })
  actor: Relation<User>;

  @Column({ type: 'varchar', length: 50 })
  action: TaskHistoryAction;

  @Column({ name: 'previous_value', type: 'jsonb', nullable: true, default: null })
  previousValue: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', default: {} })
  newValue: Record<string, unknown>;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true, default: null })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true, default: null })
  userAgent: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'now()' })
  occurredAt: Date;
}
