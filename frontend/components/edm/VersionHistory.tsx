'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, RotateCcw, Loader2, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { listVersions, restoreVersion } from '@/lib/api/documents-v2';
import type { IDocVersion } from '@/interfaces/IDocumentV2';

interface Props {
  documentId: string;
  currentVersion: number;
  onRestore?: () => void;
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  auto_save: 'Авто',
  manual_save: 'Ручное',
  status_change: 'Смена статуса',
  migration: 'Миграция',
};

export function VersionHistory({ documentId, currentVersion, onRestore }: Props) {
  const qc = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['doc-versions', documentId],
    queryFn: () => listVersions(documentId),
  });

  const restoreMutation = useMutation({
    mutationFn: (vn: number) => restoreVersion(documentId, vn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-versions', documentId] });
      qc.invalidateQueries({ queryKey: ['document-v2', documentId] });
      onRestore?.();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 mb-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">История версий</span>
      </div>

      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Нет сохранённых версий</p>
      ) : (
        versions.map((v) => {
          const isCurrent = v.versionNumber === currentVersion;
          return (
            <div
              key={v.id}
              className={cn(
                'rounded-lg border p-2.5 flex flex-col gap-1 transition-colors',
                isCurrent ? 'border-[oklch(0.546_0.245_262.881)] bg-[oklch(0.546_0.245_262.881)]/5' : 'bg-card',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">v{v.versionNumber}</span>
                  {isCurrent && (
                    <span className="text-[10px] bg-[oklch(0.546_0.245_262.881)] text-white px-1.5 py-0.5 rounded font-medium">
                      текущая
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {CHANGE_TYPE_LABEL[v.changeType] ?? v.changeType}
                  </span>
                </div>
                {!isCurrent && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    disabled={restoreMutation.isPending}
                    onClick={() => restoreMutation.mutate(v.versionNumber)}
                    title="Восстановить эту версию"
                  >
                    {restoreMutation.isPending && restoreMutation.variables === v.versionNumber
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <RotateCcw className="w-3 h-3" />}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {v.createdBy.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true, locale: ru })}
                </span>
              </div>

              {v.changeSummary && (
                <p className="text-[11px] text-muted-foreground italic truncate">
                  {v.changeSummary}
                </p>
              )}

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Tag className="w-2.5 h-2.5" />
                {v.wordCount} слов
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
