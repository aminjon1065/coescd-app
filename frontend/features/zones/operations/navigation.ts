import type { ZoneNavigationGroup } from '@/features/zones/types';
import { Permission } from '@/lib/permissions';
import { AppZone } from '@/lib/zones';

export const operationsZoneNavigation: ZoneNavigationGroup = {
  zone: AppZone.OPERATIONS,
  routes: [
    { url: '/dashboard' },
    { url: '/dashboard/documentation', requiredAnyPermissions: [Permission.DOCUMENTS_READ] },
    { url: '/dashboard/tasks', requiredAnyPermissions: [Permission.TASKS_READ] },
    { url: '/dashboard/files', requiredAnyPermissions: [Permission.FILES_READ] },
  ],
};

