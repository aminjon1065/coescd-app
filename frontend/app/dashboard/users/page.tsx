'use client';

import UsersTable from './components/usersTable';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { RouteTitleHead } from '@/features/navigation/RouteTitleHead';

export default function Page() {
  return (
    <>
      <RouteTitleHead routeKey="dashboard.users" />
      <ProtectedRouteGate
        policyKey="dashboard.users"
        deniedDescription="Раздел сотрудников доступен руководителю или администратору."
      >
        <UsersTable />
      </ProtectedRouteGate>
    </>
  );
}
