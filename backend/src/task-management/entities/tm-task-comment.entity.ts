import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { type Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TmTask } from './tm-task.entity';

@Entity('tm_task_comments')
export class TmTaskComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TmTask, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Relation<TmTask>;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author: Relation<User>;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => TmTaskComment, (c) => c.replies, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Relation<TmTaskComment> | null;

  @OneToMany(() => TmTaskComment, (c) => c.parent)
  replies: Relation<TmTaskComment>[];

  @Column({ name: 'mention_user_ids', type: 'int', array: true, default: [] })
  mentionUserIds: number[];

  @Column({ name: 'is_edited', type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true, default: null })
  editedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
