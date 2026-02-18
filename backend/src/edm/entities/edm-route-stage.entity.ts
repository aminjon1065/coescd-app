import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EdmDocumentRoute } from './edm-document-route.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { EdmStageAction } from './edm-stage-action.entity';

export type EdmStageType = 'review' | 'sign' | 'approve';
export type EdmAssigneeType = 'user' | 'role' | 'department_head';
export type EdmStageState =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'skipped'
  | 'expired';

@Entity('edm_route_stages')
export class EdmRouteStage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EdmDocumentRoute, (route) => route.stages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'route_id' })
  route: EdmDocumentRoute;

  @Column({ name: 'order_no' })
  orderNo: number;

  @Column({ name: 'stage_group_no', type: 'int', nullable: true })
  stageGroupNo: number | null;

  @Column({ name: 'stage_type' })
  stageType: EdmStageType;

  @Column({ name: 'assignee_type' })
  assigneeType: EdmAssigneeType;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignee_user_id' })
  assigneeUser: User | null;

  @Column({ name: 'assignee_role', type: 'varchar', nullable: true })
  assigneeRole: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'assignee_department_id' })
  assigneeDepartment: Department | null;

  @Column({ default: 'pending' })
  state: EdmStageState;

  @Column({ name: 'due_at', type: 'timestamp', nullable: true })
  dueAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'escalation_policy', type: 'jsonb', nullable: true })
  escalationPolicy: Record<string, unknown> | null;

  @OneToMany(() => EdmStageAction, (action) => action.stage)
  actions: EdmStageAction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
