import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EdmV2Document } from './edm-document.entity';

export type PermissionLevel = 'view' | 'comment' | 'edit' | 'approve' | 'share' | 'delete';
export type PrincipalType = 'user' | 'role' | 'department';

@Entity('edm_v2_document_permissions')
@Unique(['document', 'principalType', 'principalId', 'permission'])
export class EdmV2DocumentPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EdmV2Document, (d) => d.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: EdmV2Document;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ name: 'principal_type', length: 20 })
  principalType: PrincipalType;

  @Column({ name: 'principal_id' })
  principalId: number;

  @Column({ length: 30 })
  permission: PermissionLevel;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'granted_by_id' })
  grantedBy: User;

  @Column({ name: 'granted_by_id' })
  grantedById: number;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'NOW()' })
  grantedAt: Date;

  @Column({ name: 'expires_at', nullable: true, type: 'timestamptz' })
  expiresAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  conditions: Record<string, unknown>;
}
