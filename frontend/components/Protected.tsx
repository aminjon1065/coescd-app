'use client';

import type { ReactNode } from 'react';
import { RequirePermission } from '@/features/authz/RequirePermission';

interface ProtectedProps {
  children: ReactNode;
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  fallback?: ReactNode;
}

export function Protected({
  children,
  permission,
  anyPermissions,
  allPermissions,
  fallback = null,
}: ProtectedProps) {
  const mergedAnyPermissions = permission ? [permission, ...(anyPermissions ?? [])] : anyPermissions;

  return (
    <RequirePermission anyPermissions={mergedAnyPermissions} allPermissions={allPermissions} fallback={fallback}>
      {children}
    </RequirePermission>
  );
}

