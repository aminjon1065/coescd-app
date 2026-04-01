import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EdmV2Document } from './edm-document.entity';
import { EdmV2DocumentVersion } from './edm-document-version.entity';

@Entity('edm_v2_attachments')
export class EdmV2Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EdmV2Document, (d) => d.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: EdmV2Document;

  @Column({ name: 'document_id' })
  documentId: string;

  @ManyToOne(() => EdmV2DocumentVersion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'version_id' })
  version: EdmV2DocumentVersion | null;

  @Column({ name: 'version_id', nullable: true, type: 'uuid' })
  versionId: string | null;

  @Column({ name: 'file_name', length: 500 })
  fileName: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'mime_type', length: 200 })
  mimeType: string;

  @Column({ name: 'storage_key', length: 1000 })
  storageKey: string;

  @Column({ length: 64 })
  checksum: string;

  @Column({ name: 'is_signature', default: false })
  isSignature: boolean;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by_id' })
  uploadedById: number;

  @Column({ name: 'uploaded_at', type: 'timestamptz', default: () => 'NOW()' })
  uploadedAt: Date;
}
