'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { getAllKpiValues } from '@/lib/api/analytics-platform';
import { KpiCard } from './KpiCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KpiGridProps {
  scopeType?: string;
  scopeValue?: string;
  className?: string;
}

export function KpiGrid({ scopeType, scopeValue, className }: KpiGridProps) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['kpi-all', scopeType, scopeValue],
    queryFn: () => getAllKpiValues(scopeType, scopeValue),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-32', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = (data ?? []).filter(Boolean);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Ключевые показатели
        </h2>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.code} kpi={kpi} />
        ))}
        {kpis.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground text-sm py-8">
            Нет данных KPI. Запустите миграцию базы данных.
          </div>
        )}
      </div>
    </div>
  );
}
