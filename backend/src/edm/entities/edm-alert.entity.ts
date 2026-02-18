import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EdmDocument } from './edm-document.entity';
import { EdmRouteStage } from './edm-route-stage.entity';
import { User } from '../../users/entities/user.entity';

export type EdmAlertKind = 'due_soon' | 'overdue' | 'escalation';
export type EdmAlertStatus = 'unread' | 'read';

@Entity('edm_alerts')
export class EdmAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EdmDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: EdmDocument;

  @ManyToOne(() => EdmRouteStage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stage_id' })
  stage: EdmRouteStage;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser: User;

  @Column({ type: 'varchar' })
  kind: EdmAlertKind;

  @Column({ type: 'varchar', default: 'unread' })
  status: EdmAlertStatus;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
