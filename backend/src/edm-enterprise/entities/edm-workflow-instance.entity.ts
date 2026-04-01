import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EdmV2Document } from './edm-document.entity';
import { EdmV2WorkflowDefinition } from './edm-workflow-definition.entity';
import { EdmV2WorkflowAssignment } from './edm-workflow-assignment.entity';
import { EdmV2WorkflowTransition } from './edm-workflow-transition.entity';

export type WorkflowInstanceStatus = 'active' | 'completed' | 'cancelled' | 'paused';

@Entity('edm_v2_workflow_instances')
export class EdmV2WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EdmV2Document, (d) => d.workflowInstances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: EdmV2Document;

  @Column({ name: 'document_id' })
  documentId: string;

  @ManyToOne(() => EdmV2WorkflowDefinition, { eager: false })
  @JoinColumn({ name: 'definition_id' })
  definition: EdmV2WorkflowDefinition;

  @Column({ name: 'definition_id' })
  definitionId: string;

  @Column({ name: 'definition_snapshot', type: 'jsonb', default: () => "'{}'" })
  definitionSnapshot: Record<string, unknown>;

  @Column({ name: 'current_step_id', length: 100 })
  currentStepId: string;

  @Column({ length: 50, default: 'active' })
  status: WorkflowInstanceStatus;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  context: Record<string, unknown>;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' })
  completedAt: Date | null;

  @Column({ name: 'deadline', nullable: true, type: 'timestamptz' })
  deadline: Date | null;

  @OneToMany(() => EdmV2WorkflowAssignment, (a) => a.instance)
  assignments: EdmV2WorkflowAssignment[];

  @OneToMany(() => EdmV2WorkflowTransition, (t) => t.instance)
  transitions: EdmV2WorkflowTransition[];
}
