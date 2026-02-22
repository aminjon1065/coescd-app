import { Permission, hasAnyPermission } from '@/lib/permissions';

export enum AppZone {
  ADMIN = 'admin',
  OPERATIONS = 'operations',
  ANALYTICS = 'analytics',
  COMMUNICATION = 'communication',
}

export interface ZoneUser {
  permissions?: string[] | null;
}

export function resolveVisibleZones(user: ZoneUser | null | undefined): AppZone[] {
  const zones = new Set<AppZone>();

  if (
    hasAnyPermission(user, [
      Permission.DOCUMENTS_READ,
      Permission.TASKS_READ,
      Permission.FILES_READ,
    ])
  ) {
    zones.add(AppZone.OPERATIONS);
  }

  if (
    hasAnyPermission(user, [
      Permission.USERS_READ,
      Permission.DEPARTMENTS_READ,
      Permission.DOCUMENTS_AUDIT_READ,
      Permission.ACCESS_CONTROL_MANAGE,
    ])
  ) {
    zones.add(AppZone.ADMIN);
  }

  if (
    hasAnyPermission(user, [
      Permission.REPORTS_READ,
      Permission.ANALYTICS_READ,
      Permission.GIS_READ,
    ])
  ) {
    zones.add(AppZone.ANALYTICS);
  }

  if (hasAnyPermission(user, [Permission.CHAT_READ, Permission.CALLS_READ])) {
    zones.add(AppZone.COMMUNICATION);
  }

  return [AppZone.OPERATIONS, AppZone.ANALYTICS, AppZone.ADMIN, AppZone.COMMUNICATION].filter((zone) => zones.has(zone));
}

export function resolveZones(user: ZoneUser | null | undefined): AppZone[] {
  return resolveVisibleZones(user);
}

export const APP_ZONE_LABELS: Record<AppZone, string> = {
  [AppZone.ADMIN]: 'Admin',
  [AppZone.OPERATIONS]: 'Operations',
  [AppZone.ANALYTICS]: 'Analytics',
  [AppZone.COMMUNICATION]: 'Communication',
};
