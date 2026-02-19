'use client';

import { DocumentTable } from '../components/document-table';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

export default function InternalDocumentsPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents"
      deniedDescription="Журнал документов доступен пользователям с правом чтения документов."
    >
      <DocumentTable
        title="Внутренний контур СЭД"
        presetType="internal"
        defaultDocType="internal"
      />
    </ProtectedRouteGate>
  );
}
