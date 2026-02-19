export const ROUTE_METADATA = {
  'dashboard.access': {
    title: 'Access Control',
  },
  'dashboard.users': {
    title: 'Users',
  },
  'dashboard.users.import': {
    title: 'Users Bulk Import',
  },
  'dashboard.departments': {
    title: 'Departments',
  },
  'dashboard.auditLogs': {
    title: 'Audit Logs',
  },
  forbidden: {
    title: 'Access Forbidden',
  },
} as const;

export type RouteMetadataKey = keyof typeof ROUTE_METADATA;

export function getRouteTitle(routeKey: RouteMetadataKey): string {
  return ROUTE_METADATA[routeKey].title;
}

