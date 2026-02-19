'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { Role } from '@/enums/RoleEnum';
import { can } from '@/features/authz/can';

interface RequirePermissionProps {
  children: ReactNode;
  anyPermissions?: string[];
  allPermissions?: string[];
  roles?: Role[];
  fallback?: ReactNode;
}

export function RequirePermission({
  children,
  anyPermissions,
  allPermissions,
  roles,
  fallback = null,
}: RequirePermissionProps) {
  const { user } = useAuth();

  if (
    !can(user, {
      anyPermissions,
      allPermissions,
      roles,
    })
  ) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

