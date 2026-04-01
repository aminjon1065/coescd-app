import type { IUser } from './IUser';
import type { IDepartment } from './IDepartment';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TmTaskType =
  | 'simple'
  | 'checklist'
  | 'workflow_driven'
  | 'document_linked'
  | 'incident_related';

export type TmTaskStatus =
  | 'draft'
  | 'created'
  | 'assigned'
  | 'in_progress'
  | 'in_review'
  | 'completed'
  | 'closed'
  | 'blocked'
  | 'rejected'
  | 'reopened';

export type TmTaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TmTaskVisibility = 'private' | 'department' | 'cross_department' | 'public';
export type TmHistoryAction =
  | 'created' | 'assigned' | 'reassigned' | 'status_changed' | 'priority_changed'
  | 'due_date_changed' | 'commented' | 'attachment_added' | 'attachment_removed'
  | 'delegated' | 'escalated' | 'blocked' | 'reopened' | 'closed';

// ─── Board ────────────────────────────────────────────────────────────────────

export interface ITmTaskBoardColumn {
  id: string;
  name: string;
  status: TmTaskStatus;
  orderIndex: number;
  color: string;
  wipLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ITmTaskBoard {
  id: string;
  name: string;
  description: string | null;
  department: IDepartment | null;
  createdBy: IUser;
  visibility: 'private' | 'department' | 'global';
  isDefault: boolean;
  columns: ITmTaskBoardColumn[];
  createdAt: string;
  updatedAt: string;
}

export interface ITmTaskBoardWithTasks extends ITmTaskBoard {
  tasksByColumn: Record<string, ITmTask[]>;
}

// ─── Core Task ────────────────────────────────────────────────────────────────

export interface ITmTaskChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  completedBy: IUser | null;
  completedAt: string | null;
  orderIndex: number;
  assignedTo: IUser | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ITmTask {
  id: string;
  taskNumber: string;
  title: string;
  description: string | null;
  type: TmTaskType;
  status: TmTaskStatus;
  priority: TmTaskPriority;
  visibility: TmTaskVisibility;
  parentTask: ITmTask | null;
  subtasks: ITmTask[];
  createdBy: IUser;
  department: IDepartment | null;
  assigneeUser: IUser | null;
  assigneeDepartment: IDepartment | null;
  assigneeRole: string | null;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  slaDeadline: string | null;
  slaBreached: boolean;
  estimatedHours: number | null;
  actualHours: number | null;
  linkedDocumentId: number | null;
  linkedDocumentVersion: number | null;
  linkedIncidentId: number | null;
  workflowInstanceId: string | null;
  board: ITmTaskBoard | null;
  boardColumn: ITmTaskBoardColumn | null;
  orderIndex: number;
  tags: string[];
  metadata: Record<string, unknown>;
  blockedReason: string | null;
  rejectionReason: string | null;
  checklistItems: ITmTaskChecklistItem[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Assignment & Delegation ──────────────────────────────────────────────────

export interface ITmTaskAssignment {
  id: string;
  task: Pick<ITmTask, 'id' | 'taskNumber' | 'title'>;
  assignedToUser: IUser | null;
  assignedToDepartment: IDepartment | null;
  assignedToRole: string | null;
  assignedBy: IUser;
  assignedAt: string;
  isActive: boolean;
  notes: string | null;
  responseDeadline: string | null;
}

export interface ITmTaskDelegationChain {
  id: string;
  fromUser: IUser;
  toUser: IUser | null;
  toDepartment: IDepartment | null;
  toRole: string | null;
  delegatedAt: string;
  reason: string | null;
  level: number;
  isRevoked: boolean;
  revokedAt: string | null;
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface ITmTaskHistory {
  id: string;
  actor: IUser;
  action: TmHistoryAction;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  ipAddress: string | null;
  notes: string | null;
  occurredAt: string;
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface ITmTaskComment {
  id: string;
  author: IUser;
  content: string;
  parent: ITmTaskComment | null;
  replies: ITmTaskComment[];
  mentionUserIds: number[];
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface WorkloadItem {
  userId: number;
  name: string;
  taskCount: number;
  criticalCount: number;
}

export interface DepartmentOverview {
  departmentId: number;
  departmentName: string;
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  slaBreached: number;
  completionRate: number;
}

export interface SlaComplianceReport {
  total: number;
  compliant: number;
  breached: number;
  complianceRate: number;
  byPriority: { priority: string; total: number; breached: number }[];
}

export interface CompletionMetrics {
  period: string;
  created: number;
  completed: number;
  closed: number;
  avgCompletionHours: number;
}

// ─── API Params ──────────────────────────────────────────────────────────────

export interface GetTmTasksParams {
  page?: number;
  limit?: number;
  status?: TmTaskStatus | TmTaskStatus[];
  priority?: TmTaskPriority | TmTaskPriority[];
  type?: TmTaskType | TmTaskType[];
  assigneeUserId?: number;
  departmentId?: number;
  boardId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  isOverdue?: boolean;
  isSlaBreached?: boolean;
  q?: string;
  linkedDocumentId?: number;
  linkedIncidentId?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTmTaskPayload {
  title: string;
  description?: string;
  type: TmTaskType;
  priority: TmTaskPriority;
  visibility?: TmTaskVisibility;
  dueAt?: string;
  estimatedHours?: number;
  assigneeUserId?: number;
  assigneeDepartmentId?: number;
  assigneeRole?: string;
  parentTaskId?: string;
  linkedDocumentId?: number;
  linkedDocumentVersion?: number;
  linkedIncidentId?: number;
  tags?: string[];
  boardId?: string;
  checklistItems?: { title: string; assignedToId?: number; dueAt?: string }[];
}

export interface AssignTmTaskPayload {
  assigneeUserId?: number;
  assigneeDepartmentId?: number;
  assigneeRole?: string;
  notes?: string;
  responseDeadline?: string;
  reason?: string;
}

export interface ChangeStatusPayload {
  status: TmTaskStatus;
  reason?: string;
}

export interface CreateCommentPayload {
  content: string;
  parentId?: string;
  mentionUserIds?: number[];
}
