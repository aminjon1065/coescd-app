'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Plus, SearchIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { IGisFeature } from '@/interfaces/IGisFeature';
import { gisApi } from '@/lib/api/gis';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { Permission } from '@/lib/permissions';
import { hasPermission, setPermissionSubject } from '@/lib/permissions';
import { CreateFeatureDialog } from './components/create-feature-dialog';
import { FeatureDetailPanel } from './components/feature-detail-panel';
import { SEVERITY_COLORS, SEVERITY_LABEL, STATUS_LABEL } from './components/map-container';

const GisMapContainer = dynamic(() => import('./components/map-container'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  low: 'bg-green-500/15 text-green-700 dark:text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export default function GisPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.gis"
      deniedDescription="Карта ЧС доступна пользователям с правами GIS."
    >
      <GisContent />
    </ProtectedRouteGate>
  );
}

function GisContent() {
  const { user, accessToken } = useAuth();

  // Determine write access
  if (user) setPermissionSubject(user);
  const canWrite = !!user && hasPermission(Permission.GIS_WRITE);

  const [features, setFeatures] = useState<IGisFeature[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Selection & panels
  const [selected, setSelected] = useState<IGisFeature | null>(null);
  const [createPos, setCreatePos] = useState<{ lat: number; lng: number } | null>(null);

  const fetchFeatures = useCallback(async () => {
    try {
      const res = await gisApi.getFeatures({ limit: 200 });
      setFeatures(res.items);
    } catch (err) {
      console.error('Failed to load GIS features', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    fetchFeatures();
  }, [accessToken, fetchFeatures]);

  // Client-side filter
  const filtered = features.filter((f) => {
    const matchSearch =
      !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchSeverity = !severityFilter || f.severity === severityFilter;
    const matchStatus = !statusFilter || f.status === statusFilter;
    return matchSearch && matchSeverity && matchStatus;
  });

  const handleMapClick = (lat: number, lng: number) => {
    setSelected(null);
    setCreatePos({ lat, lng });
  };

  const handleFeatureCreated = (feature: IGisFeature) => {
    setFeatures((prev) => [feature, ...prev]);
    setSelected(feature);
    setCreatePos(null);
  };

  const handleFeatureUpdated = (updated: IGisFeature) => {
    setFeatures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setSelected(updated);
  };

  const handleFeatureDeleted = (id: number) => {
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    setSelected(null);
  };

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
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-4" style={{ height: 'calc(100vh - 8rem)' }}>
        {/* ── Map ── */}
        <div className="md:col-span-3 min-h-[400px]">
          <GisMapContainer
            features={filtered}
            selectedId={selected?.id}
            canWrite={canWrite}
            onSelectFeature={setSelected}
            onMapClick={handleMapClick}
          />
        </div>

        {/* ── Sidebar ── */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                <MapPin className="h-4 w-4 inline mr-1 text-muted-foreground" />
                Объекты ({filtered.length})
              </CardTitle>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={() => setCreatePos({ lat: 38.56, lng: 68.77 })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Добавить
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="space-y-1.5 mt-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  className="pl-8 h-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Select
                  value={severityFilter}
                  onValueChange={(v) => setSeverityFilter(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Серьёзность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="low">Низкая</SelectItem>
                    <SelectItem value="medium">Средняя</SelectItem>
                    <SelectItem value="high">Высокая</SelectItem>
                    <SelectItem value="critical">Крит.</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="active">Активная</SelectItem>
                    <SelectItem value="monitoring">Монит.</SelectItem>
                    <SelectItem value="resolved">Устранена</SelectItem>
                    <SelectItem value="archived">Архив</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          {/* Detail panel or feature list */}
          <CardContent className="flex-1 overflow-y-auto p-3">
            {selected ? (
              <FeatureDetailPanel
                feature={selected}
                canWrite={canWrite}
                onClose={() => setSelected(null)}
                onUpdated={handleFeatureUpdated}
                onDeleted={handleFeatureDeleted}
              />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {search || severityFilter || statusFilter
                  ? 'Нет объектов по фильтрам'
                  : 'Объектов пока нет'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((f) => (
                  <button
                    key={f.id}
                    className={`w-full text-left rounded-lg border p-2.5 transition-colors hover:bg-muted/50 ${
                      selected && (selected as IGisFeature).id === f.id
                        ? 'border-primary bg-muted/30'
                        : ''
                    }`}
                    onClick={() => setSelected(f)}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-medium text-xs leading-tight line-clamp-1">
                        {f.title}
                      </p>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: SEVERITY_COLORS[f.severity] }}
                      />
                    </div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${SEVERITY_BADGE_CLASS[f.severity]}`}
                      >
                        {SEVERITY_LABEL[f.severity]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {STATUS_LABEL[f.status]}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      {createPos && (
        <CreateFeatureDialog
          open={!!createPos}
          latitude={createPos.lat}
          longitude={createPos.lng}
          onOpenChange={(open) => { if (!open) setCreatePos(null); }}
          onCreated={handleFeatureCreated}
        />
      )}
    </>
  );
}
