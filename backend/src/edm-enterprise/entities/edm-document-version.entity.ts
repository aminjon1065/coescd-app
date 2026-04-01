import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EdmV2Document } from './edm-document.entity';

export type VersionChangeType = 'auto_save' | 'manual_save' | 'status_change' | 'migration';

@Entity('edm_v2_document_versions')
@Unique(['document', 'versionNumber'])
export class EdmV2DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EdmV2Document, (d) => d.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: EdmV2Document;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ name: 'version_number' })
  versionNumber: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  content: Record<string, unknown>;

  @Column({ name: 'change_summary', length: 500, nullable: true, type: 'varchar' })
  changeSummary: string | null;

  @Column({ name: 'change_type', length: 50, default: 'auto_save' })
  changeType: VersionChangeType;

  @Column({ name: 'word_count', default: 0 })
  wordCount: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
