import type { ZoneNavigationGroup } from '@/features/zones/types';
import { Permission } from '@/lib/permissions';
import { AppZone } from '@/lib/zones';

export const analyticsZoneNavigation: ZoneNavigationGroup = {
  zone: AppZone.ANALYTICS,
  routes: [
    {
      url: '/dashboard/analytics',
      requiredAnyPermissions: [Permission.ANALYTICS_READ],
    },
  ],
};
