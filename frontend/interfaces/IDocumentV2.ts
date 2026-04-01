/* ─────────────────────────────────────────────────────────────
 * Enterprise EDM v2 — TypeScript Interfaces
 * ───────────────────────────────────────────────────────────── */

export type DocV2Status = 'draft' | 'review' | 'approval' | 'signed' | 'archived' | 'rejected';
export type PermissionLevel = 'view' | 'comment' | 'edit' | 'approve' | 'share' | 'delete';
export type PrincipalType = 'user' | 'role' | 'department';
export type CommentStatus = 'open' | 'resolved' | 'accepted' | 'rejected';
export type WorkflowInstanceStatus = 'active' | 'completed' | 'cancelled' | 'paused';
export type VersionChangeType = 'auto_save' | 'manual_save' | 'status_change' | 'migration';

/* ── User stub ── */
export interface DocUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
}

/* ── Department stub ── */
export interface DocDepartment {
  id: number;
  name: string;
}

/* ── Core document ── */
export interface IDocumentV2 {
  id: string;
  title: string;
  docType: string;
  status: DocV2Status;
  owner: DocUser;
  ownerId: number;
  department: DocDepartment | null;
  departmentId: number | null;
  currentVersion: number;
  isDeleted: boolean;
  externalRef: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdBy: DocUser;
  createdById: number;
  updatedById: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  attachments?: IDocAttachment[];
}

/* ── Version ── */
export interface IDocVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  content: Record<string, unknown>;
  changeSummary: string | null;
  changeType: VersionChangeType;
  wordCount: number;
  createdBy: DocUser;
  createdAt: string;
}

/* ── Permission grant ── */
export interface IDocPermission {
  id: string;
  documentId: string;
  principalType: PrincipalType;
  principalId: number;
  permission: PermissionLevel;
  grantedBy: DocUser;
  grantedAt: string;
  expiresAt: string | null;
  conditions: Record<string, unknown>;
}

/* ── Workflow step definition ── */
export interface WorkflowStepDef {
  id: string;
  name: string;
  type: 'editing' | 'review' | 'approval' | 'signing' | 'terminal';
  assignee: { type: string; value?: string };
  requireComment?: string[];
  transitions: Array<{ action: string; to: string }>;
}

/* ── Workflow assignment ── */
export interface IWorkflowAssignment {
  id: string;
  stepId: string;
  assignee: DocUser;
  assigneeId: number;
  assignedAt: string;
  deadline: string | null;
  actedAt: string | null;
  action: string | null;
  comment: string | null;
  isRequired: boolean;
}

/* ── Workflow transition history entry ── */
export interface IWorkflowTransition {
  id: string;
  fromStepId: string;
  toStepId: string | null;
  action: string;
  actor: DocUser;
  comment: string | null;
  transitionedAt: string;
}

/* ── Full workflow instance ── */
export interface IWorkflowInstance {
  id: string;
  documentId: string;
  definitionId: string;
  definitionSnapshot: { steps: WorkflowStepDef[]; slaConfig: Record<string, number> };
  currentStepId: string;
  status: WorkflowInstanceStatus;
  context: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  deadline: string | null;
  assignments: IWorkflowAssignment[];
  transitions: IWorkflowTransition[];
}

/* ── Comment ── */
export interface IDocComment {
  id: string;
  documentId: string;
  parentId: string | null;
  anchor: { from: number; to: number; text: string } | null;
  body: string;
  isSuggestion: boolean;
  status: CommentStatus;
  createdBy: DocUser;
  createdAt: string;
  updatedAt: string;
  resolvedBy?: DocUser | null;
  resolvedAt: string | null;
  replies: IDocComment[];
}

/* ── Attachment ── */
export interface IDocAttachment {
  id: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  checksum: string;
  isSignature: boolean;
  uploadedBy: DocUser;
  uploadedAt: string;
}

/* ── Audit event ── */
export interface IDocAuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: DocUser | null;
  actorIp: string | null;
  changes: Record<string, [unknown, unknown]> | null;
  context: Record<string, unknown>;
  occurredAt: string;
}

/* ── Search / list response ── */
export interface DocListResponse {
  items: IDocumentV2[];
  total: number;
  page: number;
  limit: number;
}

/* ── Search params ── */
export interface DocSearchParams {
  q?: string;
  status?: DocV2Status;
  ownerId?: number;
  departmentId?: number;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortDir?: 'ASC' | 'DESC';
}

/* ── Presence (WebSocket) ── */
export interface DocPresence {
  userId: number;
  name: string;
  color: string;
  status: 'viewing' | 'editing';
}

/* ── Socket events ── */
export interface CollabInitEvent {
  content: Record<string, unknown>;
  version: number;
  presence: DocPresence[];
}
export interface CollabContentEvent {
  content: Record<string, unknown>;
  actorId: number;
  actorName: string;
  color: string;
}
export interface CollabCursorEvent {
  actorId: number;
  actorName: string;
  color: string;
  from: number;
  to: number;
}
export interface CollabPresenceEvent {
  presence: DocPresence[];
}
