import {
  AudioWaveform,
  BookOpen,
  Command,
  CompassIcon, FileChartColumnIcon, FolderOpenIcon,
  Frame, ListTodoIcon, Map, MapPinnedIcon,
  PieChart, UsersRoundIcon,
} from 'lucide-react';

export const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Сайт комитета',
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
      name: 'Чат общение',
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

export const sideBarRoutes = [
  {
    title: 'Аналитика',
    url: '/dashboard/analytic',
    icon: FileChartColumnIcon,
  },
  {
    title: 'Задачи',
    url: '/dashboard/tasks',
    icon: ListTodoIcon,
  },
  {
    title: 'Документация',
    url: '/dashboard/documentation',
    icon: BookOpen,
    items: [
      {
        title: 'Входящие',
        url: '/dashboard/documentation',
      },
      {
        title: 'Исходящие',
        url: '/dashboard/documentation/sent',
      },
      {
        title: 'Внутренние',
        url: '/dashboard/documentation/internal',
      },
    ],
  },
  {
    title: 'Файлы',
    url: '/dashboard/files',
    icon: FolderOpenIcon,
  },
  {
    title: 'GIS',
    url: '/dashboard/gis',
    icon: MapPinnedIcon,
  },
  {
    title: 'Пользователи',
    url: '/dashboard/users',
    icon: UsersRoundIcon,
  },
];
