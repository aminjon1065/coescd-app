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
