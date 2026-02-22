import { IUser } from './IUser';
import { IDepartment } from './IDepartment';

export type FileStatus = 'active' | 'quarantined' | 'deleted';

export interface IFile {
  id: number;
  originalName: string;
  storageKey: string;
  bucket: string;
  mimeType: string;
  sizeBytes: string;
  checksumSha256: string;
  owner: IUser;
  department: IDepartment | null;
  status: FileStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
