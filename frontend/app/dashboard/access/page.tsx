'use client';

import AccessControlAdmin from './components/accessControlAdmin';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { RouteTitleHead } from '@/features/navigation/RouteTitleHead';

export default function Page() {
  return (
    <>
      <RouteTitleHead routeKey="dashboard.access" />
      <ProtectedRouteGate
        policyKey="dashboard.access"
        deniedDescription="Раздел управления доступами доступен только администратору."
      >
        <AccessControlAdmin />
      </ProtectedRouteGate>
    </>
  );
}
