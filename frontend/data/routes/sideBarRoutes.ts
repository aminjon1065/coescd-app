import {
  AudioWaveform,
  Command,
  CompassIcon,
  Frame,
  Map, PieChart,
} from 'lucide-react';
import { navItems, type NavItem } from '@/features/navigation/nav.config';

export type SidebarRoute = NavItem;

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

export const sideBarRoutes: SidebarRoute[] = navItems;
