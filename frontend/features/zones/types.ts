import type { AppZone } from '@/lib/zones';

export type ZoneNavRoute = {
  url: string;
  requiredAnyPermissions?: string[];
};

export type ZoneNavigationGroup = {
  zone: AppZone;
  routes: ZoneNavRoute[];
};

