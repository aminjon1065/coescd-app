import { PermissionType } from '../../iam/authorization/permission.type';
import { Role } from '../enums/role.enum';

export type BulkImportRow = {
  rowNumber: number;
  email: string;
  name: string;
  role: Role;
  departmentId: number | null;
  position: string | null;
  isActive: boolean;
  permissions: PermissionType[];
  password: string | null;
};

export type BulkImportRowError = {
  rowNumber: number;
  field: string;
  code: string;
  message: string;
};

export type BulkImportDryRunSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  toCreate: number;
  toUpdate: number;
  unchanged: number;
};

export type BulkImportSession = {
  id: string;
  createdAt: number;
  actorId: number;
  mode: 'upsert';
  allowRoleUpdate: boolean;
  allowPermissionUpdate: boolean;
  rows: BulkImportRow[];
  errors: BulkImportRowError[];
  warnings: BulkImportRowError[];
  summary: BulkImportDryRunSummary;
};

