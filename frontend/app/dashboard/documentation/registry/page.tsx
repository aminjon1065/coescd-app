'use client';

import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { RegistrationJournalTable } from '../components/registration-journal-table';

export default function RegistrationJournalPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents"
      deniedDescription="Registration journal is available for users with documents access."
    >
      <RegistrationJournalTable />
    </ProtectedRouteGate>
  );
}
