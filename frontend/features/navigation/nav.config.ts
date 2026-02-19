import {
  BookOpen,
  Building2Icon,
  ClipboardListIcon,
  FileChartColumnIcon,
  FolderOpenIcon,
  ListTodoIcon,
  MapPinnedIcon,
  PieChart,
  ShieldCheckIcon,
  UsersRoundIcon,
  type LucideIcon,
} from 'lucide-react';
import { Role } from '@/enums/RoleEnum';
import { getRoutePolicy, type RoutePolicyKey } from '@/features/authz/route-policies';

export type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  policyKey?: RoutePolicyKey;
  roles?: Role[];
  requiredAnyPermissions?: string[];
  requiredAllPermissions?: string[];
  items?: {
    title: string;
    url: string;
  }[];
};

const gisPolicy = getRoutePolicy('dashboard.gis');
const usersPolicy = getRoutePolicy('dashboard.users');
const accessPolicy = getRoutePolicy('dashboard.access');
const departmentsPolicy = getRoutePolicy('dashboard.departments');
const auditLogsPolicy = getRoutePolicy('dashboard.auditLogs');
const analyticsPolicy = getRoutePolicy('dashboard.analytics');
const tasksPolicy = getRoutePolicy('dashboard.tasks');
const documentsPolicy = getRoutePolicy('dashboard.documents');
const filesPolicy = getRoutePolicy('dashboard.files');

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: PieChart,
  },
  {
    title: 'Analytics',
    url: '/dashboard/analytic',
    icon: FileChartColumnIcon,
    policyKey: 'dashboard.analytics',
    requiredAnyPermissions: analyticsPolicy.anyPermissions,
  },
  {
    title: 'Tasks',
    url: '/dashboard/tasks',
    icon: ListTodoIcon,
    policyKey: 'dashboard.tasks',
    requiredAnyPermissions: tasksPolicy.anyPermissions,
  },
  {
    title: 'Documentation',
    url: '/dashboard/documentation',
    icon: BookOpen,
    policyKey: 'dashboard.documents',
    requiredAnyPermissions: documentsPolicy.anyPermissions,
    items: [
      {
        title: 'Incoming',
        url: '/dashboard/documentation',
      },
      {
        title: 'Outgoing',
        url: '/dashboard/documentation/sent',
      },
      {
        title: 'Internal',
        url: '/dashboard/documentation/internal',
      },
      {
        title: 'My Approvals',
        url: '/dashboard/documentation/approvals',
      },
    ],
  },
  {
    title: 'Files',
    url: '/dashboard/files',
    icon: FolderOpenIcon,
    policyKey: 'dashboard.files',
    requiredAnyPermissions: filesPolicy.anyPermissions,
  },
  {
    title: 'GIS',
    url: '/dashboard/gis',
    icon: MapPinnedIcon,
    policyKey: 'dashboard.gis',
    requiredAnyPermissions: gisPolicy.anyPermissions,
  },
  {
    title: 'Staff',
    url: '/dashboard/users',
    icon: UsersRoundIcon,
    policyKey: 'dashboard.users',
    roles: usersPolicy.roles,
    requiredAllPermissions: usersPolicy.allPermissions,
  },
  {
    title: 'Access Control',
    url: '/dashboard/access',
    icon: ShieldCheckIcon,
    policyKey: 'dashboard.access',
    roles: accessPolicy.roles,
  },
  {
    title: 'Departments',
    url: '/dashboard/departments',
    icon: Building2Icon,
    policyKey: 'dashboard.departments',
    roles: departmentsPolicy.roles,
  },
  {
    title: 'Audit Logs',
    url: '/dashboard/audit-logs',
    icon: ClipboardListIcon,
    policyKey: 'dashboard.auditLogs',
    roles: auditLogsPolicy.roles,
  },
];
