import {
  AudioWaveform,
  BookOpen,
  Command,
  CompassIcon,
  FileChartColumnIcon,
  FolderOpenIcon,
  Frame,
  ListTodoIcon,
  Map,
  MapPinnedIcon,
  PieChart,
  UsersRoundIcon,
  Building2Icon,
  ShieldCheckIcon,
  ClipboardListIcon,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Role } from '@/enums/RoleEnum';

export type SidebarRoute = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  allowedRoles?: Role[];
  requiredAnyPermissions?: string[];
  items?: {
    title: string;
    url: string;
  }[];
};

export const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Committee Site',
      logo: CompassIcon,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: Command,
      plan: 'Free',
    },
  ],
  projects: [
    {
      name: 'Chat',
      url: '#',
      icon: Frame,
    },
    {
      name: 'Sales & Marketing',
      url: '#',
      icon: PieChart,
    },
    {
      name: 'Travel',
      url: '#',
      icon: Map,
    },
  ],
};

export const sideBarRoutes: SidebarRoute[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: PieChart,
  },
  {
    title: 'Analytics',
    url: '/dashboard/analytic',
    icon: FileChartColumnIcon,
  },
  {
    title: 'Tasks',
    url: '/dashboard/tasks',
    icon: ListTodoIcon,
  },
  {
    title: 'Documentation',
    url: '/dashboard/documentation',
    icon: BookOpen,
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
    ],
  },
  {
    title: 'Files',
    url: '/dashboard/files',
    icon: FolderOpenIcon,
  },
  {
    title: 'GIS',
    url: '/dashboard/gis',
    icon: MapPinnedIcon,
    requiredAnyPermissions: ['gis.write', 'analytics.write'],
  },
  {
    title: 'Staff',
    url: '/dashboard/users',
    icon: UsersRoundIcon,
    allowedRoles: [Role.Admin, Role.Manager],
  },
  {
    title: 'Access Control',
    url: '/dashboard/access',
    icon: ShieldCheckIcon,
    allowedRoles: [Role.Admin],
  },
  {
    title: 'Departments',
    url: '/dashboard/departments',
    icon: Building2Icon,
    allowedRoles: [Role.Admin],
  },
  {
    title: 'Audit Logs',
    url: '/dashboard/audit-logs',
    icon: ClipboardListIcon,
    allowedRoles: [Role.Admin],
  },
];
