'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const AnalyticsMap = dynamic(
  () => import('@/components/analytics/map/AnalyticsMap').then(m => m.AnalyticsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export default function MapPage() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <AnalyticsMap />
    </div>
  );
}
