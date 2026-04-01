export enum TaskType {
  Simple          = 'simple',
  Checklist       = 'checklist',
  WorkflowDriven  = 'workflow_driven',
  DocumentLinked  = 'document_linked',
  IncidentRelated = 'incident_related',
}

export enum TaskStatus {
  Draft      = 'draft',
  Created    = 'created',
  Assigned   = 'assigned',
  InProgress = 'in_progress',
  InReview   = 'in_review',
  Completed  = 'completed',
  Closed     = 'closed',
  Blocked    = 'blocked',
  Rejected   = 'rejected',
  Reopened   = 'reopened',
}

export enum TaskPriority {
  Low      = 'low',
  Medium   = 'medium',
  High     = 'high',
  Critical = 'critical',
}

export enum TaskVisibility {
  Private         = 'private',
  Department      = 'department',
  CrossDepartment = 'cross_department',
  Public          = 'public',
}

export enum TaskHistoryAction {
  Created           = 'created',
  Assigned          = 'assigned',
  Reassigned        = 'reassigned',
  StatusChanged     = 'status_changed',
  PriorityChanged   = 'priority_changed',
  DueDateChanged    = 'due_date_changed',
  Commented         = 'commented',
  AttachmentAdded   = 'attachment_added',
  AttachmentRemoved = 'attachment_removed',
  Delegated         = 'delegated',
  Escalated         = 'escalated',
  Blocked           = 'blocked',
  Reopened          = 'reopened',
  Closed            = 'closed',
}

export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.Draft]:      [TaskStatus.Created],
  [TaskStatus.Created]:    [TaskStatus.Assigned, TaskStatus.Draft],
  [TaskStatus.Assigned]:   [TaskStatus.InProgress, TaskStatus.Blocked, TaskStatus.Rejected],
  [TaskStatus.InProgress]: [TaskStatus.InReview, TaskStatus.Blocked],
  [TaskStatus.InReview]:   [TaskStatus.Completed, TaskStatus.Rejected, TaskStatus.InProgress],
  [TaskStatus.Completed]:  [TaskStatus.Closed, TaskStatus.Reopened],
  [TaskStatus.Closed]:     [TaskStatus.Reopened],
  [TaskStatus.Blocked]:    [TaskStatus.Assigned],
  [TaskStatus.Rejected]:   [TaskStatus.Assigned, TaskStatus.Closed],
  [TaskStatus.Reopened]:   [TaskStatus.Assigned],
};
