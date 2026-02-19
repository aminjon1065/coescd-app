'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { Role } from '@/enums/RoleEnum';
import { can } from '@/features/authz/can';

interface Props {
  children: ReactNode;
  requiredRoles?: Role[];
  requiredPermissions?: string[];
}

export function CanAccess({ children, requiredRoles, requiredPermissions }: Props) {
  const { user } = useAuth();

  if (
    !can(user, {
      roles: requiredRoles,
      allPermissions: requiredPermissions,
    })
  ) {
    return null;
  }

  return <>{children}</>;
}
