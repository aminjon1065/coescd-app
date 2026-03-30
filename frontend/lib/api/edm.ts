import api from '@/lib/axios';
import { ListResponse } from '@/lib/list-response';
import {
  IEdmDocument,
  EdmDocumentType,
  EdmDocumentStatus,
} from '@/interfaces/IEdmDocument';

// ─── Query params ─────────────────────────────────────────────────────────────

export interface GetEdmDocumentsParams {
  page?: number;
  limit?: number;
  type?: EdmDocumentType;
  status?: EdmDocumentStatus;
  departmentId?: number;
  kindId?: number;
  q?: string;
  fromDate?: string;
  toDate?: string;
  filterId?: number;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateEdmDocumentPayload {
  title: string;
  type: EdmDocumentType;
  confidentiality?: string;
  kindId?: number;
  departmentId?: number;
  externalNumber?: string;
  description?: string;
}

export interface SubmitToRoutePayload {
  routeTemplateId?: number;
  completionPolicy?: 'sequential' | 'parallel_all' | 'parallel_any_of';
  stages?: Array<{
    orderNo: number;
    stageType: string;
    assigneeType: 'user' | 'role' | 'department_head';
    assigneeUserId?: number;
    assigneeDepartmentId?: number;
    assigneeRole?: string;
    dueAt?: string;
    stageGroupNo?: number;
    escalationPolicy?: string;
  }>;
}

export interface ExecuteStageActionPayload {
  action:
    | 'approved'
    | 'rejected'
    | 'returned_for_revision'
    | 'commented'
    | 'override_approved'
    | 'override_rejected';
  commentText?: string;
  reasonCode?: string;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const edmApi = {
  // Documents
  getDocuments: (params: GetEdmDocumentsParams = {}) =>
    api.get<ListResponse<IEdmDocument>>('/edm/documents', { params }).then((r) => r.data),

  getDocument: (id: number) =>
    api.get<IEdmDocument>(`/edm/documents/${id}`).then((r) => r.data),

  createDocument: (payload: CreateEdmDocumentPayload) =>
    api.post<IEdmDocument>('/edm/documents', payload).then((r) => r.data),

  updateDocument: (id: number, payload: Partial<CreateEdmDocumentPayload>) =>
    api.put<IEdmDocument>(`/edm/documents/${id}`, payload).then((r) => r.data),

  archiveDocument: (id: number) =>
    api.delete(`/edm/documents/${id}`),

  // Routing workflow
  submitToRoute: (id: number, payload: SubmitToRoutePayload) =>
    api.post(`/edm/documents/${id}/submit`, payload).then((r) => r.data),

  executeStageAction: (documentId: number, stageId: number, payload: ExecuteStageActionPayload) =>
    api.post(`/edm/documents/${documentId}/route/${stageId}/action`, payload).then((r) => r.data),

  overrideRoute: (id: number, payload: { overrideAction: 'force_approve' | 'force_reject'; reason: string }) =>
    api.post(`/edm/documents/${id}/override`, payload).then((r) => r.data),

  // History & audit
  getDocumentHistory: (id: number, params?: { eventTypes?: string[]; fromDate?: string; toDate?: string }) =>
    api.get(`/edm/documents/${id}/history`, { params }).then((r) => r.data),

  getDocumentAudit: (id: number, params?: { actions?: string[]; fromDate?: string; toDate?: string }) =>
    api.get(`/edm/documents/${id}/audit`, { params }).then((r) => r.data),

  // Route templates
  getRouteTemplates: (params?: { page?: number; limit?: number }) =>
    api.get('/edm/route-templates', { params }).then((r) => r.data),

  getRouteTemplate: (id: number) =>
    api.get(`/edm/route-templates/${id}`).then((r) => r.data),

  // Document kinds
  getDocumentKinds: () =>
    api.get('/edm/document-kinds').then((r) => r.data),

  // Saved filters
  getSavedFilters: () =>
    api.get('/edm/saved-filters').then((r) => r.data),

  createSavedFilter: (payload: { name: string; filters: object }) =>
    api.post('/edm/saved-filters', payload).then((r) => r.data),

  deleteSavedFilter: (id: number) =>
    api.delete(`/edm/saved-filters/${id}`),

  // Alerts
  getAlerts: (params?: { status?: 'unread' | 'read'; page?: number; limit?: number }) =>
    api.get('/edm/alerts', { params }).then((r) => r.data),

  markAlertRead: (id: number) =>
    api.patch(`/edm/alerts/${id}/read`).then((r) => r.data),

  // Registration journal
  getRegistrationJournal: (params?: { journalType?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/edm/registration-journal', { params }).then((r) => r.data),

  // Reports
  getReports: () =>
    api.get('/edm/reports').then((r) => r.data),
};
