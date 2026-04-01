'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import { QueryBuilder } from '@/components/analytics/explorer/QueryBuilder';
import { ResultTable } from '@/components/analytics/explorer/ResultTable';
import { executeExplorerQuery } from '@/lib/api/analytics-platform';
import type { IExplorerResult, IQueryBuilderConfig } from '@/interfaces/IAnalytics';

const AVAILABLE_TABLES = [
  'anl_fact_incidents',
  'anl_fact_weather',
  'anl_fact_seismic',
  'anl_fact_resource_deployment',
  'anl_kpi_snapshots',
  'anl_geo_boundaries',
  'anl_geo_risk_zones',
  'anl_geo_infrastructure',
  'anl_dim_geography',
  'anl_dim_incident_type',
];

export default function ExplorerPage() {
  const [result, setResult] = useState<IExplorerResult | null>(null);

  const mutation = useMutation({
    mutationFn: (config: IQueryBuilderConfig) => executeExplorerQuery({ builderConfig: config }),
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-card">
        <Database className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Обозреватель данных</h1>
          <p className="text-xs text-muted-foreground">Запросы к хранилищу аналитических данных</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <QueryBuilder
          tables={AVAILABLE_TABLES}
          onExecute={(config) => mutation.mutate(config)}
          loading={mutation.isPending}
        />

        {mutation.isError && (
          <div className="border border-destructive/30 bg-destructive/10 rounded-xl px-4 py-3 text-sm text-destructive">
            {(mutation.error as Error)?.message ?? 'Ошибка выполнения запроса'}
          </div>
        )}

        {result && (
          <ResultTable result={result} />
        )}
      </div>
    </div>
  );
}
