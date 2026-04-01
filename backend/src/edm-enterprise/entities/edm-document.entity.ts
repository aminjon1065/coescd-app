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
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { OrgUnit } from '../../iam/entities/org-unit.entity';
import { EdmV2DocumentVersion } from './edm-document-version.entity';
import { EdmV2DocumentPermission } from './edm-document-permission.entity';
import { EdmV2WorkflowInstance } from './edm-workflow-instance.entity';
import { EdmV2Comment } from './edm-comment.entity';
import { EdmV2Attachment } from './edm-attachment.entity';

export type EdmV2DocumentStatus =
  | 'draft'
  | 'review'
  | 'approval'
  | 'signed'
  | 'archived'
  | 'rejected';

@Entity('edm_v2_documents')
export class EdmV2Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  title: string;

  @Column({ name: 'doc_type', length: 100 })
  docType: string;

  @Column({ length: 50, default: 'draft' })
  status: EdmV2DocumentStatus;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @ManyToOne(() => Department, { nullable: true, eager: false })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @Column({ name: 'department_id', nullable: true })
  departmentId: number | null;

  @ManyToOne(() => OrgUnit, { nullable: true, eager: false })
  @JoinColumn({ name: 'org_unit_id' })
  orgUnit: OrgUnit | null;

  @Column({ name: 'org_unit_id', nullable: true })
  orgUnitId: number | null;

  @Column({ name: 'current_version', default: 1 })
  currentVersion: number;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'locked_by_id', nullable: true, type: 'int' })
  lockedById: number | null;

  @Column({ name: 'locked_at', nullable: true, type: 'timestamptz' })
  lockedAt: Date | null;

  @Column({ name: 'external_ref', length: 200, nullable: true, type: 'varchar' })
  externalRef: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'", nullable: false })
  tags: string[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: number;

  @Column({ name: 'updated_by_id', nullable: true, type: 'int' })
  updatedById: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'archived_at', nullable: true, type: 'timestamptz' })
  archivedAt: Date | null;

  /* ── relations ── */
  @OneToMany(() => EdmV2DocumentVersion, (v) => v.document)
  versions: EdmV2DocumentVersion[];

  @OneToMany(() => EdmV2DocumentPermission, (p) => p.document)
  permissions: EdmV2DocumentPermission[];

  @OneToMany(() => EdmV2WorkflowInstance, (wi) => wi.document)
  workflowInstances: EdmV2WorkflowInstance[];

  @OneToMany(() => EdmV2Comment, (c) => c.document)
  comments: EdmV2Comment[];

  @OneToMany(() => EdmV2Attachment, (a) => a.document)
  attachments: EdmV2Attachment[];
}
