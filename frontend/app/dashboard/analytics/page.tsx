'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Clock, FileText, TrendingUp } from 'lucide-react';
import { KpiGrid } from '@/components/analytics/kpi/KpiGrid';
import { TimeSeriesChart } from '@/components/analytics/charts/TimeSeriesChart';
import { HeatCalendar } from '@/components/analytics/charts/HeatCalendar';
import { getIncidentTrend } from '@/lib/api/analytics-platform';
import { useAnalyticsFiltersStore } from '@/lib/stores/analytics-filters-store';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const KPI_CODES = [
  'INC_TOTAL_30D',
  'INC_AVG_RESPONSE_7D',
  'RES_UTILIZATION_RATE',
  'EDM_PENDING_APPROVALS',
  'INC_SEVERITY_AVG_7D',
  'INC_AFFECTED_30D',
];

export default function AnalyticsPage() {
  const { groupBy, setGroupBy } = useAnalyticsFiltersStore();

  const { data: trendData = [] } = useQuery({
    queryKey: ['incidents-trend', groupBy],
    queryFn: () => getIncidentTrend({ groupBy, days: groupBy === 'day' ? 30 : groupBy === 'week' ? 90 : 365 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: calendarData = [] } = useQuery({
    queryKey: ['incidents-trend-calendar'],
    queryFn: () => getIncidentTrend({ groupBy: 'day', days: 365 }),
    staleTime: 15 * 60 * 1000,
    select: (rows) => rows.map(r => ({ date: r.day ?? r.week ?? r.month ?? '', value: Number(r.count ?? 0) })),
  });

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div>
          <h1 className="text-xl font-semibold">Аналитика и разведка</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Платформа данных КЧС — ситуационная осведомлённость в реальном времени</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/analytics/map">
            <Button variant="outline" size="sm">
              <Activity className="w-4 h-4 mr-1.5" /> Карта
            </Button>
          </Link>
          <Link href="/dashboard/analytics/explorer">
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-1.5" /> Обозреватель
            </Button>
          </Link>
          <Link href="/dashboard/analytics/reports">
            <Button size="sm">
              <FileText className="w-4 h-4 mr-1.5" /> Отчёты
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Grid */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ключевые показатели</h2>
          </div>
          <KpiGrid kpiCodes={KPI_CODES} />
        </section>

        {/* Trend chart */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Динамика ЧС</h2>
            </div>
            <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">По дням</SelectItem>
                <SelectItem value="week">По неделям</SelectItem>
                <SelectItem value="month">По месяцам</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TimeSeriesChart
            data={trendData.map(r => ({
              date: String(r.day ?? r.week ?? r.month ?? ''),
              count: Number(r.count ?? 0),
              avg_severity: Number(r.avg_severity ?? 0),
            }))}
            series={[
              { key: 'count', name: 'Количество ЧС', color: '#3b82f6' },
              { key: 'avg_severity', name: 'Ср. тяжесть', color: '#f59e0b' },
            ]}
            title=""
            height={280}
          />
        </section>

        {/* Calendar heatmap */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Активность за год</h2>
          </div>
          <div className="border rounded-xl p-4 bg-card">
            <HeatCalendar data={calendarData} title="" />
          </div>
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/analytics/map', label: 'ГИС карта', desc: 'Пространственный анализ и слои', icon: Activity, color: 'text-blue-500' },
            { href: '/dashboard/analytics/explorer', label: 'Обозреватель', desc: 'Запросы к данным', icon: TrendingUp, color: 'text-green-500' },
            { href: '/dashboard/analytics/dashboards', label: 'Дашборды', desc: 'Настраиваемые панели', icon: AlertTriangle, color: 'text-amber-500' },
            { href: '/dashboard/analytics/reports', label: 'Отчёты', desc: 'PDF и Excel генерация', icon: FileText, color: 'text-purple-500' },
          ].map(item => (
            <Link key={item.href} href={item.href}>
              <div className="border rounded-xl p-4 bg-card hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <item.icon className={`w-5 h-5 mb-2 ${item.color}`} />
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
