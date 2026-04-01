import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EdmV2WorkflowInstance } from './edm-workflow-instance.entity';

@Entity('edm_v2_workflow_assignments')
@Unique(['instance', 'stepId', 'assignee'])
export class EdmV2WorkflowAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EdmV2WorkflowInstance, (i) => i.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance: EdmV2WorkflowInstance;

  @Column({ name: 'instance_id' })
  instanceId: string;

  @Column({ name: 'step_id', length: 100 })
  stepId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User;

  @Column({ name: 'assignee_id' })
  assigneeId: number;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @Column({ name: 'deadline', nullable: true, type: 'timestamptz' })
  deadline: Date | null;

  @Column({ name: 'acted_at', nullable: true, type: 'timestamptz' })
  actedAt: Date | null;

  @Column({ length: 50, nullable: true, type: 'varchar' })
  action: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'is_required', default: true })
  isRequired: boolean;
}
