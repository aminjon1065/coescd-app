'use client';

import { RouteTitleHead } from '@/features/navigation/RouteTitleHead';
import DepartmentsAdmin from './components/departmentsAdmin';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

export default function Page() {
  return (
    <>
      <RouteTitleHead routeKey="dashboard.departments" />
      <ProtectedRouteGate
        policyKey="dashboard.departments"
        deniedDescription="Раздел департаментов доступен только администратору."
      >
        <DepartmentsAdmin />
      </ProtectedRouteGate>
    </>
  );
}
