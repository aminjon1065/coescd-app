import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EdmDocument } from './edm-document.entity';
import { User } from '../../users/entities/user.entity';

export type EdmDocumentTimelineEventType =
  | 'created'
  | 'edited'
  | 'forwarded'
  | 'responsible_assigned'
  | 'responsible_reassigned'
  | 'reply_sent'
  | 'route_action'
  | 'override'
  | 'archived';

@Entity('edm_document_timeline_events')
export class EdmDocumentTimelineEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EdmDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: EdmDocument;

  @Column({ name: 'event_type', type: 'varchar' })
  eventType: EdmDocumentTimelineEventType;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_user_id' })
  toUser: User | null;

  @Column({ name: 'from_role', type: 'varchar', nullable: true })
  fromRole: string | null;

  @Column({ name: 'to_role', type: 'varchar', nullable: true })
  toRole: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser: User | null;

  @ManyToOne(() => EdmDocumentTimelineEvent, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_event_id' })
  parentEvent: EdmDocumentTimelineEvent | null;

  @Column({ name: 'thread_id', type: 'varchar', nullable: true })
  threadId: string | null;

  @Column({ name: 'comment_text', type: 'text', nullable: true })
  commentText: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
