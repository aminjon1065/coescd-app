import api from '../axios';
import type {
  IDocumentV2,
  IDocVersion,
  IDocPermission,
  IWorkflowInstance,
  IDocComment,
  IDocAttachment,
  IDocAuditEvent,
  DocListResponse,
  DocSearchParams,
  PermissionLevel,
  PrincipalType,
} from '../../interfaces/IDocumentV2';

const BASE = '/documents';

/* ─────────────────────────── Documents ─────────────────────────── */

export async function listDocuments(params: DocSearchParams): Promise<DocListResponse> {
  const { data } = await api.get(BASE, { params });
  return data;
}

export async function getDocument(id: string): Promise<IDocumentV2> {
  const { data } = await api.get(`${BASE}/${id}`);
  return data;
}

export async function getMyQueue(): Promise<IDocumentV2[]> {
  const { data } = await api.get(`${BASE}/my-queue`);
  return data;
}

export async function createDocument(payload: {
  title: string;
  docType: string;
  departmentId?: number;
  orgUnitId?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<IDocumentV2> {
  const { data } = await api.post(BASE, payload);
  return data;
}

export async function updateDocumentMetadata(
  id: string,
  payload: {
    title?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    externalRef?: string | null;
  },
): Promise<IDocumentV2> {
  const { data } = await api.patch(`${BASE}/${id}/metadata`, payload);
  return data;
}

export async function saveDocumentContent(
  id: string,
  content: Record<string, unknown>,
  autoSave = true,
): Promise<void> {
  await api.post(`${BASE}/${id}/content`, { content, autoSave });
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

export async function archiveDocument(id: string): Promise<IDocumentV2> {
  const { data } = await api.post(`${BASE}/${id}/archive`);
  return data;
}

/* ─────────────────────────── Versions ─────────────────────────── */

export async function listVersions(id: string): Promise<IDocVersion[]> {
  const { data } = await api.get(`${BASE}/${id}/versions`);
  return data;
}

export async function getVersion(id: string, vn: number): Promise<IDocVersion> {
  const { data } = await api.get(`${BASE}/${id}/versions/${vn}`);
  return data;
}

export async function restoreVersion(id: string, vn: number): Promise<IDocVersion> {
  const { data } = await api.post(`${BASE}/${id}/versions/${vn}/restore`);
  return data;
}

/* ─────────────────────────── Workflow ─────────────────────────── */

export async function startWorkflow(id: string): Promise<IWorkflowInstance> {
  const { data } = await api.post(`${BASE}/${id}/workflow/start`);
  return data;
}

export async function getWorkflow(id: string): Promise<IWorkflowInstance | null> {
  const { data } = await api.get(`${BASE}/${id}/workflow`);
  return data;
}

export async function performTransition(
  id: string,
  action: string,
  comment?: string,
): Promise<IWorkflowInstance> {
  const { data } = await api.post(`${BASE}/${id}/workflow/transition`, { action, comment });
  return data;
}

/* ─────────────────────────── Permissions ─────────────────────────── */

export async function listPermissions(id: string): Promise<IDocPermission[]> {
  const { data } = await api.get(`${BASE}/${id}/permissions`);
  return data;
}

export async function grantPermission(
  id: string,
  principalType: PrincipalType,
  principalId: number,
  permission: PermissionLevel,
  expiresAt?: string,
): Promise<IDocPermission> {
  const { data } = await api.post(`${BASE}/${id}/permissions`, {
    principalType,
    principalId,
    permission,
    expiresAt,
  });
  return data;
}

export async function revokePermission(id: string, permissionId: string): Promise<void> {
  await api.delete(`${BASE}/${id}/permissions/${permissionId}`);
}

/* ─────────────────────────── Comments ─────────────────────────── */

export async function listComments(id: string): Promise<IDocComment[]> {
  const { data } = await api.get(`${BASE}/${id}/comments`);
  return data;
}

export async function addComment(
  id: string,
  body: string,
  options?: {
    parentId?: string;
    anchor?: { from: number; to: number; text: string };
    isSuggestion?: boolean;
  },
): Promise<IDocComment> {
  const { data } = await api.post(`${BASE}/${id}/comments`, { body, ...options });
  return data;
}

export async function updateComment(id: string, cid: string, body: string): Promise<IDocComment> {
  const { data } = await api.patch(`${BASE}/${id}/comments/${cid}`, { body });
  return data;
}

export async function resolveComment(
  id: string,
  cid: string,
  status: 'resolved' | 'accepted' | 'rejected' = 'resolved',
): Promise<IDocComment> {
  const { data } = await api.post(`${BASE}/${id}/comments/${cid}/resolve`, { status });
  return data;
}

export async function deleteComment(id: string, cid: string): Promise<void> {
  await api.delete(`${BASE}/${id}/comments/${cid}`);
}

/* ─────────────────────────── Attachments ─────────────────────────── */

export async function listAttachments(id: string): Promise<IDocAttachment[]> {
  const { data } = await api.get(`${BASE}/${id}/attachments`);
  return data;
}

export async function deleteAttachment(id: string, aid: string): Promise<void> {
  await api.delete(`${BASE}/${id}/attachments/${aid}`);
}

/* ─────────────────────────── Activity ─────────────────────────── */

export async function getActivity(
  id: string,
  limit = 50,
  offset = 0,
): Promise<{ items: IDocAuditEvent[]; total: number }> {
  const { data } = await api.get(`${BASE}/${id}/activity`, { params: { limit, offset } });
  return data;
}
