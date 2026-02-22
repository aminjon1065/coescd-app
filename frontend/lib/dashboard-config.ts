import {
  ActivityIcon,
  AlertTriangleIcon,
  Building2Icon,
  ClipboardListIcon,
  FileIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import { Role } from '@/enums/RoleEnum';
import { adminDashboardPreset } from '@/features/dashboard/presets/admin';
import { managerDashboardPreset } from '@/features/dashboard/presets/manager';
import { regularDashboardPreset } from '@/features/dashboard/presets/regular';
import type { DashboardWidgetConfig } from '@/features/dashboard/types';
import { Permission } from '@/lib/permissions';

export const dashboardByRole: Record<Role, DashboardWidgetConfig[]> = {
  [Role.Admin]: adminDashboardPreset,
  [Role.Manager]: managerDashboardPreset,
  [Role.Regular]: regularDashboardPreset,
};

export type DashboardQuickAction = {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  anyPermissions?: string[];
  analystOnly?: boolean;
};

const commonQuickActions: DashboardQuickAction[] = [
  {
    key: 'documents',
    href: '/dashboard/documentation',
    label: 'СЭД документы',
    icon: FileIcon,
    anyPermissions: [Permission.DOCUMENTS_READ],
  },
  {
    key: 'tasks',
    href: '/dashboard/tasks',
    label: 'Задачи',
    icon: ClipboardListIcon,
    anyPermissions: [Permission.TASKS_READ],
  },
  {
    key: 'files',
    href: '/dashboard/files',
    label: 'Файлы',
    icon: Building2Icon,
    anyPermissions: [Permission.FILES_READ],
  },
  {
    key: 'analytics',
    href: '/dashboard/analytic',
    label: 'Аналитика',
    icon: ActivityIcon,
    anyPermissions: [Permission.ANALYTICS_READ, Permission.REPORTS_READ],
  },
  {
    key: 'gis',
    href: '/dashboard/gis',
    label: 'Карта ЧС',
    icon: AlertTriangleIcon,
    anyPermissions: [Permission.GIS_READ, Permission.GIS_WRITE, Permission.ANALYTICS_WRITE],
    analystOnly: true,
  },
];

export const quickActionsByRole: Record<Role, DashboardQuickAction[]> = {
  [Role.Regular]: commonQuickActions,
  [Role.Manager]: [
    ...commonQuickActions,
    {
      key: 'users',
      href: '/dashboard/users',
      label: 'Работники',
      icon: UsersIcon,
      anyPermissions: [Permission.USERS_READ],
    },
  ],
  [Role.Admin]: [
    ...commonQuickActions,
    {
      key: 'users',
      href: '/dashboard/users',
      label: 'Работники',
      icon: UsersIcon,
      anyPermissions: [Permission.USERS_READ],
    },
    {
      key: 'access',
      href: '/dashboard/access',
      label: 'Доступы и роли',
      icon: ShieldCheckIcon,
      anyPermissions: [Permission.USERS_READ],
    },
    {
      key: 'audit',
      href: '/dashboard/audit-logs',
      label: 'Audit Logs',
      icon: ShieldCheckIcon,
      anyPermissions: [Permission.DOCUMENTS_AUDIT_READ],
    },
  ],
};

