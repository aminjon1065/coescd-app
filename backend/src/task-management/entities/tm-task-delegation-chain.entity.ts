import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { type Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { TmTask } from './tm-task.entity';

@Entity('tm_task_delegation_chains')
export class TmTaskDelegationChain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TmTask, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Relation<TmTask>;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: Relation<User>;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_user_id' })
  toUser: Relation<User> | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_dept_id' })
  toDepartment: Relation<Department> | null;

  @Column({ name: 'to_role', type: 'varchar', length: 100, nullable: true, default: null })
  toRole: string | null;

  @CreateDateColumn({ name: 'delegated_at', type: 'timestamptz' })
  delegatedAt: Date;

  @Column({ type: 'text', nullable: true, default: null })
  reason: string | null;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true, default: null })
  revokedAt: Date | null;
}
