import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EdmV2WorkflowInstance } from './edm-workflow-instance.entity';

@Entity('edm_v2_workflow_transitions')
export class EdmV2WorkflowTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EdmV2WorkflowInstance, (i) => i.transitions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance: EdmV2WorkflowInstance;

  @Column({ name: 'instance_id' })
  instanceId: string;

  @Column({ name: 'from_step_id', length: 100 })
  fromStepId: string;

  @Column({ name: 'to_step_id', length: 100, nullable: true, type: 'varchar' })
  toStepId: string | null;

  @Column({ length: 50 })
  action: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ name: 'actor_id' })
  actorId: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @Column({ name: 'transitioned_at', type: 'timestamptz', default: () => 'NOW()' })
  transitionedAt: Date;
}
