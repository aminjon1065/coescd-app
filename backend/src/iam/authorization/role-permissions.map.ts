import { Role } from '../../users/enums/role.enum';
import { Permission, PermissionType } from './permission.type';

const ALL_PERMISSIONS = Object.values(Permission) as PermissionType[];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, PermissionType[]> = {
  [Role.Admin]: ALL_PERMISSIONS,
  [Role.Manager]: [
    Permission.USERS_READ,
    Permission.DEPARTMENTS_READ,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_CREATE,
    Permission.DOCUMENTS_UPDATE,
    Permission.TASKS_READ,
    Permission.TASKS_CREATE,
    Permission.TASKS_UPDATE,
    Permission.TASKS_ASSIGN,
    Permission.ANALYTICS_READ,
    Permission.REPORTS_READ,
    Permission.REPORTS_GENERATE,
    Permission.GIS_READ,
    Permission.FILES_READ,
    Permission.FILES_WRITE,
  ],
  [Role.Regular]: [
    Permission.DOCUMENTS_READ,
    Permission.TASKS_READ,
    Permission.ANALYTICS_READ,
    Permission.GIS_READ,
    Permission.FILES_READ,
  ],
};

export function getRolePermissions(role: Role): PermissionType[] {
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

export function resolveUserPermissions(
  role: Role,
  customPermissions: PermissionType[] = [],
): PermissionType[] {
  return [...new Set([...getRolePermissions(role), ...customPermissions])];
}
