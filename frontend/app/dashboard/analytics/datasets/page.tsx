'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Upload, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDatasets } from '@/lib/api/analytics-platform';
import type { IDataset } from '@/interfaces/IAnalytics';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const STATUS_ICON: Record<string, React.ReactNode> = {
  ready:       <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  processing:  <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
  pending:     <Clock className="w-3.5 h-3.5 text-amber-500" />,
  error:       <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
};

const STATUS_LABEL: Record<string, string> = {
  ready:      'Готов',
  processing: 'Обработка',
  pending:    'Ожидание',
  error:      'Ошибка',
};

const FORMAT_COLOR: Record<string, string> = {
  csv:       'bg-green-500/10 text-green-600 border-green-500/20',
  excel:     'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  geojson:   'bg-blue-500/10 text-blue-600 border-blue-500/20',
  shapefile: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  api:       'bg-orange-500/10 text-orange-600 border-orange-500/20',
  internal:  'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

export default function DatasetsPage() {
  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Каталог данных</h1>
            <p className="text-xs text-muted-foreground">Зарегистрированные источники и наборы данных</p>
          </div>
        </div>
        <Link href="/dashboard/analytics/datasets/upload">
          <Button size="sm">
            <Upload className="w-4 h-4 mr-1.5" /> Загрузить
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : datasets.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Database className="w-8 h-8 opacity-30" />
            <p className="text-sm">Нет наборов данных</p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Название</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Формат</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Строк</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((ds: IDataset) => (
                  <tr key={ds.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/analytics/datasets/${ds.id}`} className="font-medium hover:underline">
                        {ds.name}
                      </Link>
                      {ds.description && <p className="text-xs text-muted-foreground mt-0.5">{ds.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium ${FORMAT_COLOR[ds.format] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {ds.format.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {ds.rowCount != null ? ds.rowCount.toLocaleString('ru') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICON[ds.status] ?? null}
                        <span className="text-xs">{STATUS_LABEL[ds.status] ?? ds.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ds.updatedAt), { locale: ru, addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
