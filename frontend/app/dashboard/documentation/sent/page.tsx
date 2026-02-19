'use client';

import { DocumentTable } from '../components/document-table';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

export default function SentDocumentsPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents"
      deniedDescription="Журнал документов доступен пользователям с правом чтения документов."
    >
      <DocumentTable
        title="Канцелярский журнал: исходящие"
        presetType="outgoing"
        defaultDocType="outgoing"
      />
    </ProtectedRouteGate>
  );
}
