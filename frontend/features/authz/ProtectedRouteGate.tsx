'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@/enums/RoleEnum';
import ProtectedContent from '@/ProtectedContent';
import { AccessDeniedCard } from '@/features/authz/AccessDeniedCard';
import { RequirePermission } from '@/features/authz/RequirePermission';
import { getRoutePolicy, RoutePolicyKey } from '@/features/authz/route-policies';
import { useAuth } from '@/context/auth-context';
import { can } from '@/features/authz/can';
import Loading from '@/app/loading';

interface ProtectedRouteGateProps {
  children: ReactNode;
  policyKey?: RoutePolicyKey;
  roles?: Role[];
  anyPermissions?: string[];
  allPermissions?: string[];
  deniedTitle?: string;
  deniedDescription: string;
  onDeny?: 'fallback' | 'redirect';
  redirectTo?: string;
}

export function ProtectedRouteGate({
  children,
  policyKey,
  roles,
  anyPermissions,
  allPermissions,
  deniedTitle,
  deniedDescription,
  onDeny = 'fallback',
  redirectTo = '/forbidden',
}: ProtectedRouteGateProps) {
  const router = useRouter();
  const { loading, user } = useAuth();
  const policy = policyKey ? getRoutePolicy(policyKey) : undefined;
  const resolvedRoles = roles ?? policy?.roles;
  const resolvedAnyPermissions = anyPermissions ?? policy?.anyPermissions;
  const resolvedAllPermissions = allPermissions ?? policy?.allPermissions;
  const isAllowed = can(user, {
    roles: resolvedRoles,
    anyPermissions: resolvedAnyPermissions,
    allPermissions: resolvedAllPermissions,
  });

  useEffect(() => {
    if (onDeny !== 'redirect' || loading) {
      return;
    }
    if (user && !isAllowed) {
      router.replace(redirectTo);
    }
  }, [isAllowed, loading, onDeny, redirectTo, router, user]);

  if (onDeny === 'redirect' && loading) {
    return <Loading />;
  }

  if (onDeny === 'redirect' && user && !isAllowed) {
    return null;
  }

  return (
    <ProtectedContent>
      <RequirePermission
        roles={resolvedRoles}
        anyPermissions={resolvedAnyPermissions}
        allPermissions={resolvedAllPermissions}
        fallback={<AccessDeniedCard title={deniedTitle} description={deniedDescription} />}
      >
        {children}
      </RequirePermission>
    </ProtectedContent>
  );
}
