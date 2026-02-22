import { Role } from '@/enums/RoleEnum';

export type RoutePolicy = {
  roles?: Role[];
  anyPermissions?: string[];
  allPermissions?: string[];
};

export const ROUTE_POLICIES = {
  'dashboard.analytics': {
    anyPermissions: ['analytics.read', 'reports.read'],
  },
  'dashboard.tasks': {
    anyPermissions: ['tasks.read'],
  },
  'dashboard.tasks.detail': {
    anyPermissions: ['tasks.read'],
  },
  'dashboard.documents': {
    anyPermissions: ['documents.read'],
  },
  'dashboard.documents.detail': {
    anyPermissions: ['documents.read'],
  },
  'dashboard.files': {
    anyPermissions: ['files.read'],
  },
  'dashboard.access': {
    roles: [Role.Admin],
  },
  'dashboard.users': {
    roles: [Role.Admin, Role.Manager],
    allPermissions: ['users.read'],
  },
  'dashboard.users.import': {
    roles: [Role.Admin],
    allPermissions: ['users.update'],
  },
  'dashboard.departments': {
    roles: [Role.Admin],
  },
  'dashboard.auditLogs': {
    roles: [Role.Admin],
  },
  'dashboard.gis': {
    anyPermissions: ['gis.read', 'gis.write', 'analytics.write'],
  },
  'dashboard.chat': {
    anyPermissions: ['chat.read'],
  },
  'dashboard.calls': {
    anyPermissions: ['calls.read'],
  },
  'dashboard.contacts': {
    anyPermissions: ['chat.read', 'calls.read'],
  },
} as const satisfies Record<string, RoutePolicy>;

export type RoutePolicyKey = keyof typeof ROUTE_POLICIES;

export function getRoutePolicy(policyKey: RoutePolicyKey): RoutePolicy {
  return ROUTE_POLICIES[policyKey];
}
