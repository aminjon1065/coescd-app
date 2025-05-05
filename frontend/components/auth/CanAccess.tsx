'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';

interface Props {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export function CanAccess({ children, requiredRoles, requiredPermissions }: Props) {
  const { user } = useAuth();

  if (!user) return null;

  const hasRole =
    !requiredRoles || requiredRoles.some((role) => user.role === role);

  const hasPermission =
    !requiredPermissions ||
    requiredPermissions.every((perm) => user.permissions.includes(perm));

  if (!hasRole || !hasPermission) return null;

  return <>{children}</>;
}