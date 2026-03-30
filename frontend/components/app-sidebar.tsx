'use client';

import * as React from 'react';
import { ShieldAlert } from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';
import { useMemo } from 'react';
import { navItems, type NavItem } from '@/features/navigation/nav.config';
import { adminZoneNavigation } from '@/features/zones/admin/navigation';
import { analyticsZoneNavigation } from '@/features/zones/analytics/navigation';
import { operationsZoneNavigation } from '@/features/zones/operations/navigation';
import { communicationZoneNavigation } from '@/features/zones/communication/navigation';
import { hasAnyPermission, hasPermission, Permission, setPermissionSubject } from '@/lib/permissions';
import { APP_ZONE_LABELS, resolveVisibleZones } from '@/lib/zones';

const ZONE_NAV_GROUPS = [
  operationsZoneNavigation,
  analyticsZoneNavigation,
  adminZoneNavigation,
  communicationZoneNavigation,
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  setPermissionSubject(user ?? null);

  const routeByUrl = useMemo(() => new Map(navItems.map((item) => [item.url, item])), []);
  const zones = useMemo(() => (user ? resolveVisibleZones(user) : []), [user]);

  const adaptRoute = React.useCallback(
    (route: NavItem): NavItem => {
      if (!user) {
        return route;
      }

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
    },
    [user],
  );

  const zoneSections = useMemo(
    () => {
      if (!user || !user.permissions) {
        return [];
      }

      return ZONE_NAV_GROUPS.filter((group) => zones.includes(group.zone))
        .map((group) => {
          const items = group.routes
            .filter((routeDef) => {
              if (routeDef.requiredAnyPermissions?.length) {
                return routeDef.requiredAnyPermissions.some((p) => hasPermission(p));
              }
              if (routeDef.requiredAllPermissions?.length) {
                return routeDef.requiredAllPermissions.every((p) => hasPermission(p));
              }
              return true;
            })
            .map((routeDef) => routeByUrl.get(routeDef.url))
            .filter((route): route is NavItem => Boolean(route))
            .filter((route) => {
              if (route.roles?.length && !route.roles.includes(user.role as never)) return false;
              if (
                route.requiredAnyPermissions?.length &&
                !route.requiredAnyPermissions.some((p) => hasPermission(p))
              )
                return false;
              if (
                route.requiredAllPermissions?.length &&
                !route.requiredAllPermissions.every((p) => hasPermission(p))
              )
                return false;
              return true;
            })
            .map(adaptRoute);

          return { zone: group.zone, items };
        })
        .filter((section) => section.items.length > 0);
    },
    [adaptRoute, routeByUrl, user, zones],
  );

  if (!user || !user.permissions) {
    return null;
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* ── Logo / Platform name ──────────────────────────────────────── */}
      <SidebarHeader className="border-b border-sidebar-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="COESCD — КЧС">
              <a href="/dashboard" className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-sidebar-foreground">COESCD</span>
                  <span className="text-[11px] text-sidebar-foreground/60">Управление ЧС</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Navigation zones ─────────────────────────────────────────── */}
      <SidebarContent>
        {zoneSections.map((section, idx) => (
          <React.Fragment key={section.zone}>
            {idx > 0 && <SidebarSeparator className="my-1 opacity-30" />}
            <NavMain label={APP_ZONE_LABELS[section.zone]} items={section.items} />
          </React.Fragment>
        ))}
      </SidebarContent>

      {/* ── User footer ──────────────────────────────────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border/60">
        {user && <NavUser />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
