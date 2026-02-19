import type { RoutePolicyKey } from '@/features/authz/route-policies';

type RoutePathPolicy = {
  prefix: string;
  policyKey: RoutePolicyKey;
};

const ROUTE_PATH_POLICIES: RoutePathPolicy[] = [
  { prefix: '/dashboard/analytic', policyKey: 'dashboard.analytics' },
  { prefix: '/dashboard/tasks', policyKey: 'dashboard.tasks' },
  { prefix: '/dashboard/documentation', policyKey: 'dashboard.documents' },
  { prefix: '/dashboard/files', policyKey: 'dashboard.files' },
  { prefix: '/dashboard/users/import', policyKey: 'dashboard.users.import' },
  { prefix: '/dashboard/users', policyKey: 'dashboard.users' },
  { prefix: '/dashboard/access', policyKey: 'dashboard.access' },
  { prefix: '/dashboard/departments', policyKey: 'dashboard.departments' },
  { prefix: '/dashboard/audit-logs', policyKey: 'dashboard.auditLogs' },
  { prefix: '/dashboard/gis', policyKey: 'dashboard.gis' },
];

export function resolveRoutePolicyKey(pathname: string): RoutePolicyKey | null {
  const matched = ROUTE_PATH_POLICIES.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return matched?.policyKey ?? null;
}
