import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EdmDocument } from './edm-document.entity';
import { User } from '../../users/entities/user.entity';
import { EdmRouteStage } from './edm-route-stage.entity';

export type EdmRouteState =
  | 'active'
  | 'completed'
  | 'rejected'
  | 'returned'
  | 'cancelled';
export type EdmRouteCompletionPolicy =
  | 'sequential'
  | 'parallel_all_of'
  | 'parallel_any_of';

@Entity('edm_document_routes')
export class EdmDocumentRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EdmDocument, (document) => document.routes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: EdmDocument;

  @Column({ name: 'version_no' })
  versionNo: number;

  @Column()
  state: EdmRouteState;

  @Column({ name: 'completion_policy', default: 'sequential' })
  completionPolicy: EdmRouteCompletionPolicy;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'override_reason', type: 'text', nullable: true })
  overrideReason: string | null;

  @OneToMany(() => EdmRouteStage, (stage) => stage.route)
  stages: EdmRouteStage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
