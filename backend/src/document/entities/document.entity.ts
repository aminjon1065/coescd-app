import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';

export type DocumentType = 'incoming' | 'outgoing' | 'internal';
export type DocumentStatus = 'draft' | 'sent' | 'received' | 'archived';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['incoming', 'outgoing', 'internal'],
    default: 'internal',
  })
  type: DocumentType;

  @Column({
    type: 'enum',
    enum: ['draft', 'sent', 'received', 'archived'],
    default: 'draft',
  })
  status: DocumentStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'file_name', nullable: true })
  fileName: string;

  @Column({ name: 'file_path', nullable: true })
  filePath: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
