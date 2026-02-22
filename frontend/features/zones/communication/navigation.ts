import type { ZoneNavigationGroup } from '@/features/zones/types';
import { Permission } from '@/lib/permissions';
import { AppZone } from '@/lib/zones';

export const communicationZoneNavigation: ZoneNavigationGroup = {
  zone: AppZone.COMMUNICATION,
  routes: [
    {
      url: '/dashboard/contacts',
      requiredAnyPermissions: [Permission.CHAT_READ, Permission.CALLS_READ],
    },
    {
      url: '/dashboard/chat',
      requiredAnyPermissions: [Permission.CHAT_READ],
    },
    {
      url: '/dashboard/calls',
      requiredAnyPermissions: [Permission.CALLS_READ],
    },
  ],
};
