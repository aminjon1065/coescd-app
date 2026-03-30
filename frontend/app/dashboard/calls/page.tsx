'use client';

import { Phone, PhoneMissed, Clock, Video } from 'lucide-react';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { CallHistoryTable } from './components/call-history-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { useCallHistoryQuery } from '@/hooks/queries/useCalls';
import { ICall } from '@/interfaces/ICall';

export default function CallsPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.calls"
      deniedDescription="Раздел звонков доступен пользователям с правом просмотра звонков."
    >
      <CallHistoryContent />
    </ProtectedRouteGate>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  iconClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  iconClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className={`rounded-md p-2 ${iconClass ?? 'bg-muted'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────

function CallHistoryContent() {
  const { accessToken } = useAuth();
  // Fetch first page for KPI calculation (all calls in first 100 = summary proxy)
  const { data, isLoading } = useCallHistoryQuery(1, 100, !!accessToken);

  const calls: ICall[] = data?.items ?? [];
  const total = data?.total ?? 0;

  // KPIs derived from loaded page
  const missed = calls.filter((c) => c.status === 'missed').length;
  const withDuration = calls.filter((c) => c.durationSec != null && c.durationSec > 0);
  const avgSec =
    withDuration.length > 0
      ? Math.round(withDuration.reduce((sum, c) => sum + (c.durationSec ?? 0), 0) / withDuration.length)
      : null;
  const videoCount = calls.filter((c) => c.hasVideo).length;

  function formatAvg(sec: number | null): string {
    if (sec === null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
          ))
        ) : (
          <>
            <KpiTile
              icon={Phone}
              label="Всего звонков"
              value={total}
              iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950"
            />
            <KpiTile
              icon={PhoneMissed}
              label="Пропущено"
              value={missed}
              sub={total > 0 ? `${Math.round((missed / calls.length) * 100)}%` : undefined}
              iconClass="bg-orange-50 text-orange-600 dark:bg-orange-950"
            />
            <KpiTile
              icon={Clock}
              label="Ср. длительность"
              value={formatAvg(avgSec)}
              iconClass="bg-green-50 text-green-600 dark:bg-green-950"
            />
            <KpiTile
              icon={Video}
              label="Видеозвонков"
              value={videoCount}
              sub={calls.length > 0 ? `${Math.round((videoCount / calls.length) * 100)}%` : undefined}
              iconClass="bg-purple-50 text-purple-600 dark:bg-purple-950"
            />
          </>
        )}
      </div>

      {/* History table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">История звонков</CardTitle>
        </CardHeader>
        <CardContent>
          <CallHistoryTable />
        </CardContent>
      </Card>
    </div>
  );
}
