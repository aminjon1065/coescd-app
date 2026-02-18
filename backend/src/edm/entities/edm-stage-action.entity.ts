import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EdmRouteStage } from './edm-route-stage.entity';
import { EdmDocument } from './edm-document.entity';
import { User } from '../../users/entities/user.entity';

export type EdmStageActionType =
  | 'approved'
  | 'rejected'
  | 'returned_for_revision'
  | 'commented'
  | 'override_approved'
  | 'override_rejected';
export type EdmActionResultState =
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'commented';

@Entity('edm_stage_actions')
export class EdmStageAction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EdmRouteStage, (stage) => stage.actions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stage_id' })
  stage: EdmRouteStage;

  @ManyToOne(() => EdmDocument, (document) => document.actions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: EdmDocument;

  @Column()
  action: EdmStageActionType;

  @Column({ name: 'action_result_state' })
  actionResultState: EdmActionResultState;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_user_id' })
  actorUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'on_behalf_of_user_id' })
  onBehalfOfUser: User | null;

  @Column({ name: 'comment_text', type: 'text', nullable: true })
  commentText: string | null;

  @Column({ name: 'reason_code', type: 'varchar', nullable: true })
  reasonCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
