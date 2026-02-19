'use client';

import { DocumentTable } from './components/document-table';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

export default function IncomingDocumentsPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents"
      deniedDescription="Журнал документов доступен пользователям с правом чтения документов."
    >
      <DocumentTable
        title="Канцелярский журнал: входящие"
        presetType="incoming"
        defaultDocType="incoming"
      />
    </ProtectedRouteGate>
  );
}
