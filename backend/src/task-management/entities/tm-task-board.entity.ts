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
import { type Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { TmTaskBoardColumn } from './tm-task-board-column.entity';

@Entity('tm_task_boards')
export class TmTaskBoard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Relation<Department> | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy: Relation<User>;

  @Column({ type: 'varchar', length: 20, default: 'department' })
  visibility: 'private' | 'department' | 'global';

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @OneToMany(() => TmTaskBoardColumn, (col) => col.board, { cascade: true })
  columns: Relation<TmTaskBoardColumn>[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
