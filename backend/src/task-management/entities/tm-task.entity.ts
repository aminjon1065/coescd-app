import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
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
import { EdmDocument } from '../../edm/entities/edm-document.entity';
import { Disaster } from '../../analytics/disasters/entities/disaster.entity';
import { TmTaskBoard } from './tm-task-board.entity';
import { TmTaskBoardColumn } from './tm-task-board-column.entity';
import { TmTaskChecklistItem } from './tm-task-checklist-item.entity';
import {
  TaskType,
  TaskStatus,
  TaskPriority,
  TaskVisibility,
} from '../enums/task.enums';

@Entity('tm_tasks')
export class TmTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_number', type: 'varchar', length: 30, unique: true })
  taskNumber: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ type: 'varchar', length: 30, default: TaskType.Simple })
  type: TaskType;

  @Column({ type: 'varchar', length: 30, default: TaskStatus.Created })
  status: TaskStatus;

  @Column({ type: 'varchar', length: 20, default: TaskPriority.Medium })
  priority: TaskPriority;

  @Column({ type: 'varchar', length: 30, default: TaskVisibility.Department })
  visibility: TaskVisibility;

  // Hierarchy (subtasks)
  @ManyToOne(() => TmTask, (task) => task.subtasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: Relation<TmTask> | null;

  @OneToMany(() => TmTask, (task) => task.parentTask)
  subtasks: Relation<TmTask>[];

  // Ownership
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy: Relation<User>;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Relation<Department> | null;

  // Current assignment targets
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_user_id' })
  assigneeUser: Relation<User> | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_department_id' })
  assigneeDepartment: Relation<Department> | null;

  @Column({ name: 'assignee_role', type: 'varchar', length: 100, nullable: true, default: null })
  assigneeRole: string | null;

  // Dates & SLA
  @Column({ name: 'due_at', type: 'timestamptz', nullable: true, default: null })
  dueAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true, default: null })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true, default: null })
  completedAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true, default: null })
  closedAt: Date | null;

  @Column({ name: 'sla_deadline', type: 'timestamptz', nullable: true, default: null })
  slaDeadline: Date | null;

  @Column({ name: 'sla_breached', type: 'boolean', default: false })
  slaBreached: boolean;

  @Column({ name: 'estimated_hours', type: 'decimal', precision: 6, scale: 2, nullable: true, default: null })
  estimatedHours: number | null;

  @Column({ name: 'actual_hours', type: 'decimal', precision: 6, scale: 2, nullable: true, default: null })
  actualHours: number | null;

  // EDM Integration
  @ManyToOne(() => EdmDocument, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'linked_document_id' })
  linkedDocument: Relation<EdmDocument> | null;

  @Column({ name: 'linked_document_id', type: 'int', nullable: true, default: null })
  linkedDocumentId: number | null;

  @Column({ name: 'linked_document_version', type: 'int', nullable: true, default: null })
  linkedDocumentVersion: number | null;

  @ManyToOne(() => Disaster, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'linked_incident_id' })
  linkedIncident: Relation<Disaster> | null;

  @Column({ name: 'linked_incident_id', type: 'int', nullable: true, default: null })
  linkedIncidentId: number | null;

  @Column({ name: 'workflow_instance_id', type: 'uuid', nullable: true, default: null })
  workflowInstanceId: string | null;

  // Board placement
  @ManyToOne(() => TmTaskBoard, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'board_id' })
  board: Relation<TmTaskBoard> | null;

  @ManyToOne(() => TmTaskBoardColumn, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'board_column_id' })
  boardColumn: Relation<TmTaskBoardColumn> | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  // Metadata
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ name: 'blocked_reason', type: 'text', nullable: true, default: null })
  blockedReason: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true, default: null })
  rejectionReason: string | null;

  // Checklist items (only for type=checklist)
  @OneToMany(() => TmTaskChecklistItem, (item) => item.task, { cascade: true })
  checklistItems: Relation<TmTaskChecklistItem>[];

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
