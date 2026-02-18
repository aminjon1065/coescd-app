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
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export type SidebarRoute = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  adminOnly?: boolean;
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
  },
  {
    title: 'Users',
    url: '/dashboard/users',
    icon: UsersRoundIcon,
    adminOnly: true,
  },
  {
    title: 'Departments',
    url: '/dashboard/departments',
    icon: Building2Icon,
    adminOnly: true,
  },
];
