import React from 'react';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

const Page = () => {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.files"
      deniedDescription="Раздел файлов доступен пользователям с правом чтения файлов."
    >
      <div>Files Page</div>
    </ProtectedRouteGate>
  );
};

export default Page;
