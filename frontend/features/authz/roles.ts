import { Role } from '@/enums/RoleEnum';

export type UserRole = Role;

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  [Role.Admin]: '/dashboard/admin',
  [Role.Manager]: '/dashboard/manager',
  [Role.Regular]: '/dashboard/regular',
};

const DEFAULT_DASHBOARD_PATH = '/dashboard/regular';

export function getRoleDashboardPath(role?: UserRole | null): string {
  if (!role) {
    return DEFAULT_DASHBOARD_PATH;
  }

  return ROLE_DASHBOARD_PATH[role] ?? DEFAULT_DASHBOARD_PATH;
}
