'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import React from 'react';

// Необязательно: Словарь человеко-понятных названий
const labelMap: Record<string, string> = {
  dashboard: 'Дашборд',
  analytic: 'Аналитика',
  documentation: 'Документация',
  users: 'Пользователи',
  settings: 'Settings',
  roles: 'Roles',
  profile: 'Profile',
};

export function PageBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, idx) => {
          const href = '/' + segments.slice(0, idx + 1).join('/');
          const isLast = idx === segments.length - 1;

          return (
            <React.Fragment key={href}>
              {idx > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem className="capitalize">
                {isLast ? (
                  <BreadcrumbPage>{labelMap[segment] ?? segment}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{labelMap[segment] ?? segment}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}