import type { ZoneNavigationGroup } from '@/features/zones/types';
import { Permission } from '@/lib/permissions';
import { AppZone } from '@/lib/zones';

export const analyticsZoneNavigation: ZoneNavigationGroup = {
  zone: AppZone.ANALYTICS,
  routes: [
    {
      url: '/dashboard/analytic',
      requiredAnyPermissions: [Permission.ANALYTICS_READ, Permission.REPORTS_READ],
    },
    {
      url: '/dashboard/gis',
      requiredAnyPermissions: [Permission.GIS_READ, Permission.GIS_WRITE, Permission.ANALYTICS_WRITE],
    },
  ],
};

