import api from '@/lib/axios';
import type { ListResponse } from '@/lib/list-response';
import type {
  ITmTask,
  ITmTaskBoard,
  ITmTaskBoardWithTasks,
  ITmTaskAssignment,
  ITmTaskDelegationChain,
  ITmTaskHistory,
  ITmTaskComment,
  ITmTaskChecklistItem,
  GetTmTasksParams,
  CreateTmTaskPayload,
  AssignTmTaskPayload,
  ChangeStatusPayload,
  CreateCommentPayload,
  WorkloadItem,
  DepartmentOverview,
  SlaComplianceReport,
  CompletionMetrics,
} from '@/interfaces/ITaskManagement';

const BASE = '/task-management';

export const taskManagementApi = {
  // ── Tasks ──────────────────────────────────────────────────────────────────
  getTasks: (params: GetTmTasksParams = {}) =>
    api.get<ListResponse<ITmTask>>(`${BASE}/tasks`, { params }).then((r) => r.data),

  getTask: (id: string) =>
    api.get<ITmTask>(`${BASE}/tasks/${id}`).then((r) => r.data),

  createTask: (payload: CreateTmTaskPayload) =>
    api.post<ITmTask>(`${BASE}/tasks`, payload).then((r) => r.data),

  updateTask: (id: string, payload: Partial<CreateTmTaskPayload>) =>
    api.patch<ITmTask>(`${BASE}/tasks/${id}`, payload).then((r) => r.data),

  deleteTask: (id: string) => api.delete(`${BASE}/tasks/${id}`),

  // ── Bulk operations ────────────────────────────────────────────────────────
  bulkChangeStatus: (ids: string[], status: string, reason?: string) =>
    api
      .patch<{ updated: number; skipped: number }>(`${BASE}/tasks/bulk/status`, { ids, status, reason })
      .then((r) => r.data),

  bulkAssign: (ids: string[], payload: { assigneeUserId?: number; assigneeDepartmentId?: number; assigneeRole?: string }) =>
    api
      .patch<{ updated: number }>(`${BASE}/tasks/bulk/assign`, { ids, ...payload })
      .then((r) => r.data),

  bulkDelete: (ids: string[]) =>
    api.delete<{ deleted: number }>(`${BASE}/tasks/bulk`, { data: { ids } }).then((r) => r.data),

  changeStatus: (id: string, payload: ChangeStatusPayload) =>
    api.post<ITmTask>(`${BASE}/tasks/${id}/status`, payload).then((r) => r.data),

  getHistory: (id: string) =>
    api.get<ITmTaskHistory[]>(`${BASE}/tasks/${id}/history`).then((r) => r.data),

  moveToColumn: (id: string, columnId: string, orderIndex?: number) =>
    api
      .post<ITmTask>(`${BASE}/tasks/${id}/move`, { columnId, orderIndex })
      .then((r) => r.data),

  // ── Subtasks ───────────────────────────────────────────────────────────────
  createSubtask: (parentId: string, payload: CreateTmTaskPayload) =>
    api
      .post<ITmTask>(`${BASE}/tasks/${parentId}/subtasks`, payload)
      .then((r) => r.data),

  getSubtasks: (parentId: string) =>
    api.get<ITmTask[]>(`${BASE}/tasks/${parentId}/subtasks`).then((r) => r.data),

  // ── Checklist ──────────────────────────────────────────────────────────────
  addChecklistItem: (
    taskId: string,
    payload: { title: string; assignedToId?: number; dueAt?: string },
  ) =>
    api
      .post<ITmTaskChecklistItem>(`${BASE}/tasks/${taskId}/checklist`, payload)
      .then((r) => r.data),

  updateChecklistItem: (
    taskId: string,
    itemId: string,
    payload: Partial<{ title: string; isCompleted: boolean; assignedToId: number; dueAt: string; orderIndex: number }>,
  ) =>
    api
      .patch<ITmTaskChecklistItem>(`${BASE}/tasks/${taskId}/checklist/${itemId}`, payload)
      .then((r) => r.data),

  removeChecklistItem: (taskId: string, itemId: string) =>
    api.delete(`${BASE}/tasks/${taskId}/checklist/${itemId}`),

  // ── Assignment & Delegation ────────────────────────────────────────────────
  assignTask: (id: string, payload: AssignTmTaskPayload) =>
    api
      .post<ITmTaskAssignment>(`${BASE}/tasks/${id}/assign`, payload)
      .then((r) => r.data),

  delegateTask: (id: string, payload: AssignTmTaskPayload) =>
    api
      .post<ITmTaskAssignment>(`${BASE}/tasks/${id}/delegate`, payload)
      .then((r) => r.data),

  getDelegationChain: (id: string) =>
    api
      .get<ITmTaskDelegationChain[]>(`${BASE}/tasks/${id}/delegation-chain`)
      .then((r) => r.data),

  getAssignments: (id: string) =>
    api
      .get<ITmTaskAssignment[]>(`${BASE}/tasks/${id}/assignments`)
      .then((r) => r.data),

  revokeAssignment: (taskId: string, assignmentId: string) =>
    api.delete(`${BASE}/tasks/${taskId}/delegate/${assignmentId}`),

  // ── Comments ───────────────────────────────────────────────────────────────
  getComments: (taskId: string) =>
    api.get<ITmTaskComment[]>(`${BASE}/tasks/${taskId}/comments`).then((r) => r.data),

  addComment: (taskId: string, payload: CreateCommentPayload) =>
    api
      .post<ITmTaskComment>(`${BASE}/tasks/${taskId}/comments`, payload)
      .then((r) => r.data),

  updateComment: (taskId: string, commentId: string, content: string) =>
    api
      .patch<ITmTaskComment>(`${BASE}/tasks/${taskId}/comments/${commentId}`, { content })
      .then((r) => r.data),

  deleteComment: (taskId: string, commentId: string) =>
    api.delete(`${BASE}/tasks/${taskId}/comments/${commentId}`),

  // ── Boards ─────────────────────────────────────────────────────────────────
  getBoards: () =>
    api.get<ITmTaskBoard[]>(`${BASE}/boards`).then((r) => r.data),

  getBoard: (id: string) =>
    api.get<ITmTaskBoardWithTasks>(`${BASE}/boards/${id}`).then((r) => r.data),

  createBoard: (payload: {
    name: string;
    description?: string;
    departmentId?: number;
    visibility?: 'private' | 'department' | 'global';
    isDefault?: boolean;
  }) => api.post<ITmTaskBoard>(`${BASE}/boards`, payload).then((r) => r.data),

  addColumn: (
    boardId: string,
    payload: { name: string; status: string; color?: string; wipLimit?: number },
  ) =>
    api.post(`${BASE}/boards/${boardId}/columns`, payload).then((r) => r.data),

  updateColumn: (
    boardId: string,
    colId: string,
    payload: { name?: string; color?: string; wipLimit?: number },
  ) =>
    api.patch(`${BASE}/boards/${boardId}/columns/${colId}`, payload).then((r) => r.data),

  reorderColumns: (boardId: string, columnIds: string[]) =>
    api
      .post<ITmTaskBoard>(`${BASE}/boards/${boardId}/columns/reorder`, { columnIds })
      .then((r) => r.data),

  // ── Reports ────────────────────────────────────────────────────────────────
  getWorkload: (departmentId?: number) =>
    api
      .get<WorkloadItem[]>(`${BASE}/reports/workload`, {
        params: departmentId ? { departmentId } : {},
      })
      .then((r) => r.data),

  getDepartmentOverview: (departmentId?: number) =>
    api
      .get<DepartmentOverview[]>(`${BASE}/reports/department-overview`, {
        params: departmentId ? { departmentId } : {},
      })
      .then((r) => r.data),

  getSlaCompliance: (from?: string, to?: string) =>
    api
      .get<SlaComplianceReport>(`${BASE}/reports/sla-compliance`, {
        params: { from, to },
      })
      .then((r) => r.data),

  getCompletionMetrics: (groupBy?: 'day' | 'week' | 'month', limit?: number) =>
    api
      .get<CompletionMetrics[]>(`${BASE}/reports/completion-metrics`, {
        params: { groupBy, limit },
      })
      .then((r) => r.data),
};
