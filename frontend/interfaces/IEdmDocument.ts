import { IDepartment } from './IDepartment';
import { IUser } from './IUser';

export type EdmDocumentType =
  | 'incoming'
  | 'outgoing'
  | 'internal'
  | 'order'
  | 'resolution';

export type EdmDocumentStatus =
  | 'draft'
  | 'in_route'
  | 'approved'
  | 'rejected'
  | 'returned_for_revision'
  | 'archived';

export type EdmDocumentConfidentiality =
  | 'public_internal'
  | 'department_confidential'
  | 'restricted';

export interface IEdmRouteStageAction {
  id: number;
  action: string;
  commentText?: string | null;
  createdAt: string;
  actorUser?: IUser | null;
}

export interface IEdmRouteStage {
  id: number;
  orderNo: number;
  stageType: string;
  assigneeType: string;
  state: string;
  dueAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  assigneeUser?: IUser | null;
  assigneeDepartment?: IDepartment | null;
  actions?: IEdmRouteStageAction[];
}

export interface IEdmRoute {
  id: number;
  state: string;
  versionNo: number;
  completionPolicy: string;
  stages: IEdmRouteStage[];
}

export interface IEdmDocument {
  id: number;
  externalNumber: string | null;
  type: EdmDocumentType;
  status: EdmDocumentStatus;
  title: string;
  subject: string | null;
  summary: string | null;
  resolutionText: string | null;
  confidentiality: EdmDocumentConfidentiality;
  department: IDepartment;
  creator: IUser;
  dueAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  route?: IEdmRoute | null;
}

export interface IEdmHistoryEvent {
  id: number;
  eventType: string;
  commentText?: string | null;
  threadId?: string | null;
  createdAt: string;
  actorUser?: IUser | null;
  fromUser?: IUser | null;
  toUser?: IUser | null;
  responsibleUser?: IUser | null;
}

export interface IEdmAuditEvent {
  id: number;
  action: string;
  commentText?: string | null;
  reasonCode?: string | null;
  createdAt: string;
  actorUser?: IUser | null;
  onBehalfOfUser?: IUser | null;
  stage?: {
    id: number;
    orderNo: number;
    stageType: string;
  } | null;
}

export interface IEdmReply {
  id: number;
  threadId: string;
  messageText: string;
  createdAt: string;
  senderUser?: IUser | null;
  parentReply?: { id: number } | null;
}

export interface IEdmSavedFilterCriteria {
  status?: EdmDocumentStatus;
  type?: EdmDocumentType;
  departmentId?: number;
  creatorId?: number;
  externalNumber?: string;
  q?: string;
  fromDate?: string;
  toDate?: string;
}

export interface IEdmSavedFilter {
  id: number;
  scope: 'documents';
  name: string;
  criteria: IEdmSavedFilterCriteria;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IEdmFileAttachment {
  id: number;
  originalName: string;
  storageKey: string;
  bucket: string;
  mimeType: string;
  sizeBytes: string;
  checksumSha256: string;
  status: 'active' | 'quarantined' | 'deleted';
  createdAt: string;
  updatedAt: string;
  owner?: IUser | null;
  department?: IDepartment | null;
}
