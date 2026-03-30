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

export type NotificationKind =
  | 'task_assigned'
  | 'task_updated'
  | 'document_routed'
  | 'edm_alert'
  | 'call_incoming'
  | 'system';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({
    type: 'varchar',
    length: 64,
  })
  kind: NotificationKind;

  @Column({ type: 'text' })
  message: string;

  /** Arbitrary JSON payload (e.g. { taskId: 5, documentId: 12 }) */
  @Column({ type: 'jsonb', nullable: true, default: null })
  payload: Record<string, unknown> | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true, default: null })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
