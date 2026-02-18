import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EdmDocument } from './edm-document.entity';
import { Task } from '../../task/entities/task.entity';
import { User } from '../../users/entities/user.entity';

@Entity('edm_document_task_links')
export class EdmDocumentTaskLink {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EdmDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: EdmDocument;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
