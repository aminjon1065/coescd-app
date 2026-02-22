import { Role } from '../../users/enums/role.enum';
import { PermissionType } from '../authorization/permission.type';

export interface DelegationContextData {
  delegationId?: number;
  scopeType?: 'department' | 'global';
  scopeDepartmentId?: number | null;
  scopeOrgUnitId?: number | null;
  onBehalfOfUserId: number;
  delegatorUserId: number;
  delegateUserId: number;
  isGlobal: boolean;
  allowedDepartmentIds?: number[];
  allowedOrgUnitIds?: number[];
  allowedOrgPathPrefixes?: string[];
  permissionSubset?: string[];
  validatedAt?: string;
}

export interface ActiveUserData {
  sub: number;
  email: string;
  name: string;
  role: Role;
  departmentId?: number | null;
  businessRole?: string | null;
  orgUnitId?: number | null;
  orgUnitPath?: string | null;
  actorUserId?: number | null;
  onBehalfOfUserId?: number | null;
  delegationContext?: DelegationContextData | null;
  permissions: PermissionType[];
}
