'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { TimeSeriesChart } from '../charts/TimeSeriesChart';
import { KpiCard } from '../kpi/KpiCard';
import { getKpiValue } from '@/lib/api/analytics-platform';
import type { IWidget, IKpiValue } from '@/interfaces/IAnalytics';

interface WidgetRendererProps {
  widget: IWidget;
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  switch (widget.type) {
    case 'kpi': return <KpiWidget widget={widget} />;
    case 'chart': return <ChartWidget widget={widget} />;
    case 'text': return <TextWidget widget={widget} />;
    default: return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Виджет «{widget.type}» не реализован
      </div>
    );
  }
}

function KpiWidget({ widget }: { widget: IWidget }) {
  const code = widget.config.kpiCode as string;
  const { data, isLoading } = useQuery<IKpiValue>({
    queryKey: ['kpi-widget', code],
    queryFn: () => getKpiValue(code),
    staleTime: 5 * 60 * 1000,
    enabled: !!code,
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!data) return <div className="text-muted-foreground text-xs text-center">Нет данных</div>;

  return <KpiCard kpi={data} className="h-full" />;
}

function ChartWidget({ widget }: { widget: IWidget }) {
  return (
    <TimeSeriesChart
      data={[]}
      series={[{ key: 'count', name: 'Количество', color: '#3b82f6' }]}
      title={widget.title}
      height="100%"
    />
  );
}

function TextWidget({ widget }: { widget: IWidget }) {
  return (
    <div className="p-3 text-sm">
      {String(widget.config.text ?? '')}
    </div>
  );
}
