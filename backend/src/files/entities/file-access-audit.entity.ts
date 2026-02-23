import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';
import { User } from '../../users/entities/user.entity';

export type FileAuditAction =
  | 'upload'
  | 'presign_upload'
  | 'presign_download'
  | 'download'
  | 'delete'
  | 'restore'
  | 'link'
  | 'unlink'
  | 'share'
  | 'unshare';

@Entity('file_access_audit')
export class FileAccessAuditEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileEntity;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column()
  action: FileAuditAction;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ default: false })
  success: boolean;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
