'use client';

import { DocumentTable } from '../components/document-table';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

export default function ApprovalsQueuePage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents"
      deniedDescription="Очередь согласований доступна пользователям с правом чтения документов."
    >
      <DocumentTable
        title="Очередь согласований: мои этапы"
        source="queue"
        queueType="my-approvals"
      />
    </ProtectedRouteGate>
  );
}

