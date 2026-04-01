'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, AlertCircle } from 'lucide-react';
import type { IKpiValue } from '@/interfaces/IAnalytics';

interface KpiCardProps {
  kpi: IKpiValue;
  className?: string;
  onClick?: () => void;
}

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const THRESHOLD_STYLES = {
  normal: 'border-border',
  warning: 'border-amber-400 dark:border-amber-500',
  critical: 'border-red-500 dark:border-red-400',
};

const THRESHOLD_VALUE_STYLES = {
  normal: 'text-foreground',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
};

export function KpiCard({ kpi, className, onClick }: KpiCardProps) {
  const TrendIcon = TREND_ICON[kpi.trend ?? 'stable'];
  const trendUp = kpi.trend === 'up';
  const trendDown = kpi.trend === 'down';

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 bg-card p-4 flex flex-col gap-2 transition-all',
        THRESHOLD_STYLES[kpi.thresholdStatus],
        onClick && 'cursor-pointer hover:shadow-md',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground leading-tight line-clamp-2">{kpi.nameRu}</p>
        {kpi.thresholdStatus === 'critical' && (
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        )}
        {kpi.thresholdStatus === 'warning' && (
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        )}
      </div>

      {/* Value */}
      <div className={cn('text-2xl font-bold tabular-nums', THRESHOLD_VALUE_STYLES[kpi.thresholdStatus])}>
        {typeof kpi.value === 'number' ? kpi.value.toLocaleString('ru') : kpi.value}
        <span className="text-sm font-normal text-muted-foreground ml-1">{kpi.unit}</span>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-1">
        <TrendIcon
          className={cn('w-3.5 h-3.5', {
            'text-red-500': trendUp,
            'text-green-500': trendDown,
            'text-muted-foreground': !trendUp && !trendDown,
          })}
        />
        {kpi.vsPrevPct != null ? (
          <span className={cn('text-xs tabular-nums', {
            'text-red-500': trendUp,
            'text-green-500': trendDown,
            'text-muted-foreground': !trendUp && !trendDown,
          })}>
            {kpi.vsPrevPct > 0 ? '+' : ''}{kpi.vsPrevPct.toLocaleString('ru')}% vs пред. период
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">нет данных для сравнения</span>
        )}
      </div>
    </div>
  );
}
