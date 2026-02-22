import {
  BookOpen,
  Building2Icon,
  ClipboardListIcon,
  ContactRound,
  FileChartColumnIcon,
  FolderOpenIcon,
  ListTodoIcon,
  MapPinnedIcon,
  MessageCircleIcon,
  PhoneIcon,
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
const chatPolicy = getRoutePolicy('dashboard.chat');
const callsPolicy = getRoutePolicy('dashboard.calls');
const contactsPolicy = getRoutePolicy('dashboard.contacts');
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
      {
        title: 'Registration Journal',
        url: '/dashboard/documentation/registry',
      },
      {
        title: 'Document Kinds',
        url: '/dashboard/documentation/types',
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
    title: 'Контакты',
    url: '/dashboard/contacts',
    icon: ContactRound,
    policyKey: 'dashboard.contacts',
    requiredAnyPermissions: contactsPolicy.anyPermissions,
  },
  {
    title: 'Чат',
    url: '/dashboard/chat',
    icon: MessageCircleIcon,
    policyKey: 'dashboard.chat',
    requiredAnyPermissions: chatPolicy.anyPermissions,
  },
  {
    title: 'Звонки',
    url: '/dashboard/calls',
    icon: PhoneIcon,
    policyKey: 'dashboard.calls',
    requiredAnyPermissions: callsPolicy.anyPermissions,
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
