import { Role } from '@/enums/RoleEnum';

export type UserRole = Role;

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  [Role.Admin]: '/dashboard/admin',
  [Role.Manager]: '/dashboard/manager',
  [Role.Regular]: '/dashboard/regular',
};

export function getRoleDashboardPath(role: UserRole): string {
  return ROLE_DASHBOARD_PATH[role];
}
