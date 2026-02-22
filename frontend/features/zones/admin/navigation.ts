import type { ZoneNavigationGroup } from '@/features/zones/types';
import { Permission } from '@/lib/permissions';
import { AppZone } from '@/lib/zones';

export const adminZoneNavigation: ZoneNavigationGroup = {
  zone: AppZone.ADMIN,
  routes: [
    { url: '/dashboard/users', requiredAnyPermissions: [Permission.USERS_READ] },
    { url: '/dashboard/departments', requiredAnyPermissions: [Permission.DEPARTMENTS_READ] },
    { url: '/dashboard/access', requiredAnyPermissions: [Permission.ACCESS_CONTROL_MANAGE] },
    { url: '/dashboard/audit-logs', requiredAnyPermissions: [Permission.DOCUMENTS_AUDIT_READ] },
  ],
};
