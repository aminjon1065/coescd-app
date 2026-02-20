'use client';

import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { DocumentKindsManager } from '../components/document-kinds-manager';

export default function DocumentKindsPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents"
      deniedDescription="Document kinds catalog is available for users with documents access."
    >
      <DocumentKindsManager />
    </ProtectedRouteGate>
  );
}
