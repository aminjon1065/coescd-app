import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import { User } from '../../users/entities/user.entity';
import { EdmDocumentRoute } from './edm-document-route.entity';
import { EdmStageAction } from './edm-stage-action.entity';
import { EdmDocumentKind } from './edm-document-kind.entity';

export type EdmDocumentType =
  | 'incoming'
  | 'outgoing'
  | 'internal'
  | 'order'
  | 'resolution';
export type EdmDocumentStatus =
  | 'draft'
  | 'in_route'
  | 'approved'
  | 'rejected'
  | 'returned_for_revision'
  | 'archived';
export type EdmDocumentConfidentiality =
  | 'public_internal'
  | 'department_confidential'
  | 'restricted';

@Entity('edm_documents')
export class EdmDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'external_number', type: 'varchar', nullable: true })
  externalNumber: string | null;

  @Column()
  type: EdmDocumentType;

  @Column()
  status: EdmDocumentStatus;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  subject: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'resolution_text', type: 'text', nullable: true })
  resolutionText: string | null;

  @Column({ default: 'public_internal' })
  confidentiality: EdmDocumentConfidentiality;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @ManyToOne(() => EdmDocumentKind, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'document_kind_id' })
  documentKind: EdmDocumentKind | null;

  @ManyToOne(() => EdmDocumentRoute, { nullable: true })
  @JoinColumn({ name: 'current_route_id' })
  currentRoute: EdmDocumentRoute | null;

  @OneToMany(() => EdmDocumentRoute, (route) => route.document)
  routes: EdmDocumentRoute[];

  @OneToMany(() => EdmStageAction, (action) => action.document)
  actions: EdmStageAction[];

  @Column({ name: 'due_at', type: 'timestamp', nullable: true })
  dueAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt: Date | null;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
