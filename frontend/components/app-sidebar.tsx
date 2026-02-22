'use client';

import * as React from 'react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ModeToggle } from '@/components/toggle-theme';
import { useAuth } from '@/context/auth-context';
import { useMemo } from 'react';
import { navItems, type NavItem } from '@/features/navigation/nav.config';
import { adminZoneNavigation } from '@/features/zones/admin/navigation';
import { analyticsZoneNavigation } from '@/features/zones/analytics/navigation';
import { operationsZoneNavigation } from '@/features/zones/operations/navigation';
import { communicationZoneNavigation } from '@/features/zones/communication/navigation';
import { hasAnyPermission, hasPermission, Permission, setPermissionSubject } from '@/lib/permissions';
import { APP_ZONE_LABELS, resolveVisibleZones } from '@/lib/zones';

const ZONE_NAV_GROUPS = [operationsZoneNavigation, analyticsZoneNavigation, adminZoneNavigation, communicationZoneNavigation];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  if (!user || !user.permissions) {
    return null;
  }

  setPermissionSubject(user);

  const routeByUrl = useMemo(() => new Map(navItems.map((item) => [item.url, item])), []);
  const zones = useMemo(() => resolveVisibleZones(user), [user]);

  const adaptRoute = React.useCallback((route: NavItem): NavItem => {
    const isPrivilegedEdmUser = hasAnyPermission(user, [
      Permission.DOCUMENTS_REGISTER,
      Permission.DOCUMENTS_JOURNAL_READ,
      Permission.DOCUMENTS_TEMPLATES_READ,
      Permission.DOCUMENTS_ROUTE_TEMPLATES_READ,
    ]);

    if (!isPrivilegedEdmUser && route.url === '/dashboard') {
      return { ...route, title: 'Рабочий стол' };
    }

    if (!isPrivilegedEdmUser && route.url === '/dashboard/documentation') {
      return {
        ...route,
        title: 'Обмен документами',
        items: [
          { title: 'Полученные', url: '/dashboard/documentation' },
          { title: 'На контроле', url: '/dashboard/documentation/approvals' },
          { title: 'Отправленные', url: '/dashboard/documentation/sent' },
        ],
      };
    }

    return route;
  }, [user]);

  const zoneSections = useMemo(
    () =>
      ZONE_NAV_GROUPS
        .filter((group) => zones.includes(group.zone))
        .map((group) => {
          const items = group.routes
            .filter((routeDef) => {
              if (routeDef.requiredAnyPermissions?.length) {
                return routeDef.requiredAnyPermissions.some((permission) => hasPermission(permission));
              }
              if (routeDef.requiredAllPermissions?.length) {
                return routeDef.requiredAllPermissions.every((permission) => hasPermission(permission));
              }
              return true;
            })
            .map((routeDef) => routeByUrl.get(routeDef.url))
            .filter((route): route is NavItem => Boolean(route))
            .filter((route) => {
              if (route.requiredAnyPermissions?.length && !route.requiredAnyPermissions.some((permission) => hasPermission(permission))) {
                return false;
              }
              if (route.requiredAllPermissions?.length && !route.requiredAllPermissions.every((permission) => hasPermission(permission))) {
                return false;
              }
              return true;
            })
            .map(adaptRoute);

          return { zone: group.zone, items };
        })
        .filter((section) => section.items.length > 0),
    [adaptRoute, routeByUrl, user, zones],
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ModeToggle />
        {/*<TeamSwitcher teams={data.teams} />*/}
      </SidebarHeader>
      <SidebarContent>
        {zoneSections.map((section) => (
          <NavMain key={section.zone} label={APP_ZONE_LABELS[section.zone]} items={section.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
