'use client';

import { Phone } from 'lucide-react';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { CallHistoryTable } from './components/call-history-table';

export default function CallsPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.calls"
      deniedDescription="Раздел звонков доступен пользователям с правом просмотра звонков."
    >
      <CallHistoryContent />
    </ProtectedRouteGate>
  );
}

function CallHistoryContent() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Phone className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">История звонков</h1>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-background shadow-sm">
        <div className="p-4">
          <CallHistoryTable />
        </div>
      </div>
    </div>
  );
}
