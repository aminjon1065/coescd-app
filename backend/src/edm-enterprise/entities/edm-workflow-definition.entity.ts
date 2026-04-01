import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'editing' | 'review' | 'approval' | 'signing' | 'terminal';
  assignee: {
    type: 'role' | 'user' | 'department_head' | 'document_owner' | 'dynamic';
    value?: string;
    dynamicKey?: string;
  };
  parallel?: boolean;
  quorum?: number;
  requireComment?: string[];
  transitions: Array<{
    action: string;
    to: string;
    conditions?: Array<{ field: string; op: string; value: unknown }>;
    notify?: string[];
  }>;
}

export interface WorkflowDefinitionJson {
  initialStep: string;
  steps: WorkflowStep[];
}

@Entity('edm_v2_workflow_definitions')
export class EdmV2WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ default: 1 })
  version: number;

  @Column({ name: 'doc_types', type: 'text', array: true, default: () => "'{}'" })
  docTypes: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps: WorkflowStep[];

  @Column({ name: 'sla_config', type: 'jsonb', default: () => "'{}'" })
  slaConfig: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  escalation: Record<string, { to: string; after_minutes: number }>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
