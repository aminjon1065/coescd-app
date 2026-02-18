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

export type FileLinkResourceType = 'document' | 'task' | 'message' | 'report';

@Entity('file_links')
export class FileLinkEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileEntity;

  @Column({ name: 'resource_type' })
  resourceType: FileLinkResourceType;

  @Column({ name: 'resource_id' })
  resourceId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
