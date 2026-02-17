import { IUser } from './IUser';
import { IDepartment } from './IDepartment';

export type DocumentType = 'incoming' | 'outgoing' | 'internal';
export type DocumentStatus = 'draft' | 'sent' | 'received' | 'archived';

export interface IDocument {
  id: number;
  title: string;
  description: string;
  type: DocumentType;
  status: DocumentStatus;
  sender: IUser;
  receiver: IUser;
  department: IDepartment;
  fileName?: string | null;
  filePath?: string | null;
  createdAt: string;
  updatedAt: string;
}
