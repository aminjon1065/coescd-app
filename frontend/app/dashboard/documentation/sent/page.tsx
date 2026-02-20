'use client';

import { DocumentTable } from '../components/document-table';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

export default function SentDocumentsPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents"
      deniedDescription="Documents section is available for users with documents read permission."
    >
      <DocumentTable
        title="Outgoing Mailbox"
        source="mailbox"
        mailboxType="outgoing"
        defaultDocType="outgoing"
      />
    </ProtectedRouteGate>
  );
}
