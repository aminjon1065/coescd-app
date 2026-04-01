'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, GitCompare } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getDocument, listVersions, restoreVersion } from '@/lib/api/documents-v2';
import { StatusBadgeV2 } from '@/components/edm/StatusBadgeV2';

const CHANGE_TYPE_LABEL: Record<string, string> = {
  auto_save: 'Авто-сохранение',
  manual_save: 'Ручное сохранение',
  status_change: 'Смена статуса',
  migration: 'Миграция',
};

const CHANGE_TYPE_COLOR: Record<string, string> = {
  auto_save: 'bg-muted text-muted-foreground',
  manual_save: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  status_change: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  migration: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function DocumentHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: doc } = useQuery({
    queryKey: ['document-v2', id],
    queryFn: () => getDocument(id),
  });

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['doc-versions', id],
    queryFn: () => listVersions(id),
  });

  const restoreMutation = useMutation({
    mutationFn: (vn: number) => restoreVersion(id, vn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-versions', id] });
      qc.invalidateQueries({ queryKey: ['document-v2', id] });
    },
  });

  const currentVersion = doc?.currentVersion ?? 0;

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/documents/${id}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg truncate">{doc?.title ?? '...'}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {doc && <StatusBadgeV2 status={doc.status} />}
            <span className="text-xs text-muted-foreground">История версий</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {versions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border p-4 flex flex-col gap-1">
            <span className="text-2xl font-bold">{versions.length}</span>
            <span className="text-xs text-muted-foreground">Версий всего</span>
          </div>
          <div className="rounded-xl border p-4 flex flex-col gap-1">
            <span className="text-2xl font-bold">v{currentVersion}</span>
            <span className="text-xs text-muted-foreground">Текущая версия</span>
          </div>
          <div className="rounded-xl border p-4 flex flex-col gap-1">
            <span className="text-2xl font-bold">
              {versions.reduce((sum, v) => sum + (v.wordCount ?? 0), 0).toLocaleString('ru')}
            </span>
            <span className="text-xs text-muted-foreground">Слов в текущей</span>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <GitCompare className="w-10 h-10 opacity-30" />
            <p className="text-sm">Нет сохранённых версий</p>
          </div>
        ) : (
          <div className="divide-y">
            {versions.map((v) => {
              const isCurrent = v.versionNumber === currentVersion;
              return (
                <div
                  key={v.id}
                  className={cn(
                    'flex items-start gap-4 p-4 transition-colors',
                    isCurrent
                      ? 'bg-[oklch(0.546_0.245_262.881)]/5'
                      : 'hover:bg-muted/30',
                  )}
                >
                  {/* Version badge */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                    isCurrent
                      ? 'bg-[oklch(0.546_0.245_262.881)] text-white'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    v{v.versionNumber}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'text-[11px] font-medium px-2 py-0.5 rounded-full',
                        CHANGE_TYPE_COLOR[v.changeType] ?? 'bg-muted text-muted-foreground',
                      )}>
                        {CHANGE_TYPE_LABEL[v.changeType] ?? v.changeType}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] bg-[oklch(0.546_0.245_262.881)] text-white px-2 py-0.5 rounded-full font-medium">
                          текущая
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-5 h-5 rounded-full bg-[oklch(0.546_0.245_262.881)] flex items-center justify-center text-white text-[9px] font-bold">
                        {v.createdBy.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium">{v.createdBy.name}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground" title={format(new Date(v.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}>
                        {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true, locale: ru })}
                      </span>
                    </div>

                    {v.changeSummary && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        {v.changeSummary}
                      </p>
                    )}

                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {(v.wordCount ?? 0).toLocaleString('ru')} слов
                    </div>
                  </div>

                  {/* Actions */}
                  {!isCurrent && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8 text-xs"
                      disabled={restoreMutation.isPending}
                      onClick={() => restoreMutation.mutate(v.versionNumber)}
                    >
                      {restoreMutation.isPending && restoreMutation.variables === v.versionNumber
                        ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        : null}
                      Восстановить
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
