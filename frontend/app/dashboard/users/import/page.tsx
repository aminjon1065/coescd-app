'use client';

import { RouteTitleHead } from '@/features/navigation/RouteTitleHead';
import BulkImportAdmin from './components/bulkImportAdmin';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

export default function Page() {
  return (
    <>
      <RouteTitleHead routeKey="dashboard.users.import" />
      <ProtectedRouteGate
        policyKey="dashboard.users.import"
        deniedDescription="Массовый импорт пользователей доступен только администратору."
      >
        <BulkImportAdmin />
      </ProtectedRouteGate>
    </>
  );
}
