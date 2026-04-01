'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getKpiDefinitions, getKpiValue } from '@/lib/api/analytics-platform';
import type { IKpiDefinition, IKpiValue } from '@/interfaces/IAnalytics';
import { cn } from '@/lib/utils';

function KpiDefinitionRow({ def }: { def: IKpiDefinition }) {
  const { data: val, isLoading } = useQuery<IKpiValue>({
    queryKey: ['kpi-value', def.code],
    queryFn: () => getKpiValue(def.code),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const statusColor = {
    normal:   'text-green-600 bg-green-500/10 border-green-500/20',
    warning:  'text-amber-600 bg-amber-500/10 border-amber-500/20',
    critical: 'text-red-600 bg-red-500/10 border-red-500/20',
  }[val?.thresholdStatus ?? 'normal'] ?? '';

  const TrendIcon = val?.trend === 'up' ? TrendingUp : val?.trend === 'down' ? TrendingDown : Minus;

  return (
    <tr className="border-t hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium">{def.nameRu}</p>
        <p className="text-xs font-mono text-muted-foreground mt-0.5">{def.code}</p>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground max-w-64 truncate" title={def.formula}>
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{def.formula.slice(0, 60)}{def.formula.length > 60 ? '…' : ''}</code>
      </td>
      <td className="px-4 py-3">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : val ? (
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-semibold tabular-nums', statusColor.split(' ')[0])}>
              {typeof val.value === 'number' ? val.value.toLocaleString('ru') : String(val.value)}
            </span>
            <span className="text-xs text-muted-foreground">{val.unit}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {val && (
          <div className="flex items-center gap-1">
            <TrendIcon className={cn('w-3.5 h-3.5', val.trend === 'up' ? 'text-red-500' : val.trend === 'down' ? 'text-green-500' : 'text-muted-foreground')} />
            {val.vsPrevPct != null && (
              <span className="text-xs text-muted-foreground">{val.vsPrevPct > 0 ? '+' : ''}{val.vsPrevPct}%</span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {val?.thresholdStatus && (
          <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium', statusColor)}>
            {val.thresholdStatus === 'normal' && <CheckCircle2 className="w-3 h-3" />}
            {val.thresholdStatus === 'warning' && <AlertTriangle className="w-3 h-3" />}
            {val.thresholdStatus === 'critical' && <AlertTriangle className="w-3 h-3" />}
            {val.thresholdStatus === 'normal' ? 'Норма' : val.thresholdStatus === 'warning' ? 'Предупреждение' : 'Критично'}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {def.refreshCron}
      </td>
    </tr>
  );
}

export default function KpiManagementPage() {
  const { data: definitions = [], isLoading } = useQuery<IKpiDefinition[]>({
    queryKey: ['kpi-definitions'],
    queryFn: getKpiDefinitions,
    staleTime: 60 * 1000,
  });

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-card">
        <TrendingUp className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Управление KPI</h1>
          <p className="text-xs text-muted-foreground">Реестр ключевых показателей эффективности</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Показатель</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Формула</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Значение</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Тренд</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Расписание</th>
                </tr>
              </thead>
              <tbody>
                {definitions.map((def: IKpiDefinition) => (
                  <KpiDefinitionRow key={def.code} def={def} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
