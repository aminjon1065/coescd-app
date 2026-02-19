import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EdmDocument } from './edm-document.entity';
import { EdmDocumentTimelineEvent } from './edm-document-timeline-event.entity';
import { User } from '../../users/entities/user.entity';

@Entity('edm_document_replies')
export class EdmDocumentReply {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EdmDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: EdmDocument;

  @ManyToOne(() => EdmDocumentTimelineEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timeline_event_id' })
  timelineEvent: EdmDocumentTimelineEvent;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sender_user_id' })
  senderUser: User;

  @ManyToOne(() => EdmDocumentReply, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_reply_id' })
  parentReply: EdmDocumentReply | null;

  @Column({ name: 'thread_id', type: 'varchar' })
  threadId: string;

  @Column({ name: 'message_text', type: 'text' })
  messageText: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

