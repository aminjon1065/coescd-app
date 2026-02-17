'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { IDisaster } from '@/interfaces/IDisaster';

const DisasterMap = dynamic(
  () => import('./components/map-container'),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-lg" /> }
);

const severityLabel: Record<string, string> = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
  critical: 'Критическая',
};

const severityBadgeClass: Record<string, string> = {
  low: 'bg-green-500/15 text-green-700 dark:text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

const statusLabel: Record<string, string> = {
  active: 'Активная',
  monitoring: 'Мониторинг',
  resolved: 'Устранена',
};

export default function GisPage() {
  const { accessToken } = useAuth();
  const [disasters, setDisasters] = useState<IDisaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<IDisaster | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api
      .get('/disasters')
      .then((res) => setDisasters(res.data))
      .catch((err) => console.error('Failed to load disasters', err))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const filtered = disasters.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4" style={{ height: 'calc(100vh - 8rem)' }}>
        <div className="md:col-span-3">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="md:col-span-3 min-h-[400px]">
        <DisasterMap disasters={filtered} onSelectDisaster={setSelected} />
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Чрезвычайные ситуации</CardTitle>
          <div className="relative mt-2">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[calc(100vh-16rem)]">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Нет ЧС</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((d) => (
                <div
                  key={d.id}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                    selected?.id === d.id ? 'border-primary bg-muted/30' : ''
                  }`}
                  onClick={() => setSelected(d)}
                >
                  <p className="font-medium text-sm">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.location}</p>
                  <div className="flex gap-1 mt-2">
                    <Badge
                      className={severityBadgeClass[d.severity]}
                      variant="outline"
                    >
                      {severityLabel[d.severity]}
                    </Badge>
                    <Badge variant="outline">
                      {statusLabel[d.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
