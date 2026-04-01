'use client';

import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IExplorerResult } from '@/interfaces/IAnalytics';

interface ResultTableProps {
  result: IExplorerResult;
  onExport?: (format: 'csv' | 'json') => void;
}

const PAGE_SIZE = 50;

export function ResultTable({ result, onExport }: ResultTableProps) {
  const [page, setPage] = useState(0);
  const pageRows = result.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(result.rows.length / PAGE_SIZE);

  const exportCsv = () => {
    const header = result.columns.join(',');
    const rows = result.rows.map(r => result.columns.map(c => JSON.stringify(r[c] ?? '')).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'export.csv';
    a.click();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(result.rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'export.json';
    a.click();
  };

  if (result.rows.length === 0) {
    return (
      <div className="border rounded-xl p-8 text-center text-muted-foreground text-sm">
        Запрос вернул 0 строк
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
        <span className="text-xs text-muted-foreground">
          {result.total.toLocaleString('ru')} строк · {result.columns.length} столбцов
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={exportCsv}>
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={exportJson}>
            <Download className="w-3 h-3 mr-1" /> JSON
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-96">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
            <tr>
              {result.columns.map(col => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground border-b whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className={cn('border-b hover:bg-muted/30 transition-colors', i % 2 === 0 ? 'bg-background' : 'bg-muted/10')}>
                {result.columns.map(col => (
                  <td key={col} className="px-3 py-1.5 font-mono whitespace-nowrap max-w-48 truncate">
                    {row[col] == null
                      ? <span className="text-muted-foreground italic">NULL</span>
                      : String(row[col])
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
          <span>Стр. {page + 1} из {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
