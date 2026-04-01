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
import { EdmV2Document } from './edm-document.entity';

export type CommentStatus = 'open' | 'resolved' | 'accepted' | 'rejected';

@Entity('edm_v2_comments')
export class EdmV2Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EdmV2Document, (d) => d.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: EdmV2Document;

  @Column({ name: 'document_id' })
  documentId: string;

  @ManyToOne(() => EdmV2Comment, (c) => c.replies, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: EdmV2Comment | null;

  @Column({ name: 'parent_id', nullable: true, type: 'uuid' })
  parentId: string | null;

  @OneToMany(() => EdmV2Comment, (c) => c.parent)
  replies: EdmV2Comment[];

  @Column({ type: 'jsonb', nullable: true })
  anchor: { from: number; to: number; text: string } | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'is_suggestion', default: false })
  isSuggestion: boolean;

  @Column({ name: 'suggestion_diff', type: 'jsonb', nullable: true })
  suggestionDiff: Record<string, unknown> | null;

  @Column({ length: 30, default: 'open' })
  status: CommentStatus;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy: User | null;

  @Column({ name: 'resolved_by_id', nullable: true, type: 'int' })
  resolvedById: number | null;

  @Column({ name: 'resolved_at', nullable: true, type: 'timestamptz' })
  resolvedAt: Date | null;
}
