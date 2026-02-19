'use client';

import { RouteTitleHead } from '@/features/navigation/RouteTitleHead';
import AuditLogsAdmin from './components/auditLogsAdmin';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

export default function Page() {
  return (
    <>
      <RouteTitleHead routeKey="dashboard.auditLogs" />
      <ProtectedRouteGate
        policyKey="dashboard.auditLogs"
        deniedDescription="Журнал аудита доступен только администратору."
      >
        <AuditLogsAdmin />
      </ProtectedRouteGate>
    </>
  );
}
