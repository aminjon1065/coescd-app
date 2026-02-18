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

// This is sample data.

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const visibleRoutes = useMemo(
    () =>
      sideBarRoutes.filter((route) => {
        if (route.allowedRoles && (!user || !route.allowedRoles.includes(user.role))) {
          return false;
        }
        if (
          route.requiredAnyPermissions &&
          route.requiredAnyPermissions.length > 0 &&
          (!user?.permissions ||
            !route.requiredAnyPermissions.some((permission) =>
              user.permissions.includes(permission),
            ))
        ) {
          return false;
        }
        return true;
      }),
    [user],
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ModeToggle />
        {/*<TeamSwitcher teams={data.teams} />*/}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={visibleRoutes} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
