'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDataset, getDatasetData } from '@/lib/api/analytics-platform';
import Link from 'next/link';
import { useState } from 'react';

export default function DatasetViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  const { data: dataset, isLoading: loadingMeta } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => getDataset(id),
  });

  const { data: tableData, isLoading: loadingData } = useQuery({
    queryKey: ['dataset-data', id, page],
    queryFn: () => getDatasetData(id, { limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    enabled: !!dataset && dataset.status === 'ready',
    staleTime: 5 * 60 * 1000,
  });

  if (loadingMeta) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-sm text-muted-foreground">Набор данных не найден</p>
        <Link href="/dashboard/analytics/datasets"><Button variant="outline" size="sm">Назад</Button></Link>
      </div>
    );
  }

  const columns: string[] = tableData?.columns ?? [];
  const rows: Record<string, unknown>[] = tableData?.rows ?? [];
  const totalRows: number = tableData?.total ?? 0;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics/datasets">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{dataset.name}</h1>
            <p className="text-xs text-muted-foreground">{dataset.format.toUpperCase()} · {dataset.rowCount?.toLocaleString('ru') ?? '?'} строк</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dataset.status === 'ready' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {dataset.status === 'processing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
          {dataset.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          <span className="text-sm text-muted-foreground capitalize">{dataset.status}</span>
        </div>
      </div>

      {/* Schema */}
      {dataset.schemaDef && (
        <div className="px-6 py-3 border-b bg-muted/20">
          <div className="flex gap-2 flex-wrap">
            {Object.entries(dataset.schemaDef).map(([col, meta]) => (
              <span key={col} className="inline-flex items-center gap-1 text-xs bg-card border rounded px-2 py-0.5">
                <span className="font-mono font-medium">{col}</span>
                <span className="text-muted-foreground">{meta.type}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="flex-1 overflow-auto p-6">
        {dataset.status !== 'ready' ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
            {dataset.status === 'processing' ? (
              <><RefreshCw className="w-6 h-6 animate-spin" /><p className="text-sm">Данные обрабатываются...</p></>
            ) : (
              <><AlertCircle className="w-6 h-6" /><p className="text-sm">Данные недоступны</p></>
            )}
          </div>
        ) : loadingData ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : columns.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">Нет данных</div>
        ) : (
          <>
            <div className="border rounded-xl overflow-hidden">
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr>
                      {columns.map(col => (
                        <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground border-b whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                        {columns.map(col => (
                          <td key={col} className="px-3 py-1.5 font-mono whitespace-nowrap max-w-48 truncate border-b">
                            {row[col] == null
                              ? <span className="text-muted-foreground italic">NULL</span>
                              : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>Стр. {page + 1} из {totalPages} · {totalRows.toLocaleString('ru')} строк</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Пред.</Button>
                  <Button variant="ghost" size="sm" className="h-7" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>След. →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
