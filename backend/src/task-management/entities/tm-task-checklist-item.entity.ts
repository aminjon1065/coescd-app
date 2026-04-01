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
import { TmTask } from './tm-task.entity';

@Entity('tm_task_checklist_items')
export class TmTaskChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TmTask, (task) => task.checklistItems, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Relation<TmTask>;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted: boolean;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'completed_by' })
  completedBy: Relation<User> | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true, default: null })
  completedAt: Date | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: Relation<User> | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true, default: null })
  dueAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
