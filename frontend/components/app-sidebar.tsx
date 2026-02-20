'use client';

import * as React from 'react';


import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ModeToggle } from '@/components/toggle-theme';
import { data, sideBarRoutes } from '@/data/routes/sideBarRoutes';
import { useAuth } from '@/context/auth-context';
import { useMemo } from 'react';
import { can } from '@/features/authz/can';

// This is sample data.

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const visibleRoutes = useMemo(
    () =>
      sideBarRoutes.filter((route) => {
        return can(user, {
          roles: route.roles,
          anyPermissions: route.requiredAnyPermissions,
          allPermissions: route.requiredAllPermissions,
        });
      }),
    [user],
  );
  const adaptedRoutes = useMemo(() => {
    const role = String(user?.role ?? '');
    const isPrivilegedEdmUser = role === 'admin' || role === 'chancellery';

    return visibleRoutes.map((route) => {
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
    });
  }, [user?.role, visibleRoutes]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ModeToggle />
        {/*<TeamSwitcher teams={data.teams} />*/}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={adaptedRoutes} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
