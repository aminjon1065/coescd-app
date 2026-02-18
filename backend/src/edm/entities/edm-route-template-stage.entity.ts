import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { EdmRouteTemplate } from './edm-route-template.entity';
import { EdmAssigneeType, EdmStageType } from './edm-route-stage.entity';

@Entity('edm_route_template_stages')
export class EdmRouteTemplateStage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EdmRouteTemplate, (template) => template.stages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: EdmRouteTemplate;

  @Column({ name: 'order_no', type: 'int' })
  orderNo: number;

  @Column({ name: 'stage_group_no', type: 'int', nullable: true })
  stageGroupNo: number | null;

  @Column({ name: 'stage_type', type: 'varchar' })
  stageType: EdmStageType;

  @Column({ name: 'assignee_type', type: 'varchar' })
  assigneeType: EdmAssigneeType;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignee_user_id' })
  assigneeUser: User | null;

  @Column({ name: 'assignee_role', type: 'varchar', nullable: true })
  assigneeRole: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'assignee_department_id' })
  assigneeDepartment: Department | null;

  @Column({ name: 'due_in_hours', type: 'int', nullable: true })
  dueInHours: number | null;

  @Column({ name: 'escalation_policy', type: 'jsonb', nullable: true })
  escalationPolicy: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
