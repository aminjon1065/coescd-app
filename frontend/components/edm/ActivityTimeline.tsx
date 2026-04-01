'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, FileText, GitBranch, MessageSquare, Lock, Shield, Paperclip, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getActivity } from '@/lib/api/documents-v2';
import type { IDocAuditEvent } from '@/interfaces/IDocumentV2';
import { cn } from '@/lib/utils';

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  CREATED:          { icon: <FileText className="w-3 h-3" />,   label: 'Документ создан',       color: 'bg-[oklch(0.546_0.245_262.881)] text-white' },
  METADATA_UPDATED: { icon: <FileText className="w-3 h-3" />,   label: 'Данные обновлены',      color: 'bg-muted text-muted-foreground' },
  TRANSITION:       { icon: <GitBranch className="w-3 h-3" />,  label: 'Статус изменён',        color: 'bg-[--status-in-route-bg] text-[--status-in-route-fg]' },
  WORKFLOW_STARTED: { icon: <GitBranch className="w-3 h-3" />,  label: 'Процесс запущен',       color: 'bg-[--status-pending-bg] text-[--status-pending-fg]' },
  SLA_ESCALATED:    { icon: <Lock className="w-3 h-3" />,       label: 'SLA эскалация',         color: 'bg-[--status-overdue-bg] text-[--status-overdue-fg]' },
  COMMENT_ADDED:    { icon: <MessageSquare className="w-3 h-3" />, label: 'Комментарий добавлен', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  COMMENT_DELETED:  { icon: <MessageSquare className="w-3 h-3" />, label: 'Комментарий удалён',   color: 'bg-muted text-muted-foreground' },
  ARCHIVED:         { icon: <Archive className="w-3 h-3" />,    label: 'Архивирован',           color: 'bg-muted text-muted-foreground' },
  DELETED:          { icon: <Archive className="w-3 h-3" />,    label: 'Удалён',                color: 'bg-[--status-rejected-bg] text-[--status-rejected-fg]' },
};

function EventIcon({ action }: { action: string }) {
  const config = ACTION_CONFIG[action] ?? ACTION_CONFIG.METADATA_UPDATED;
  return (
    <span className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0', config.color)}>
      {config.icon}
    </span>
  );
}

function getActionLabel(action: string, event: IDocAuditEvent): string {
  const config = ACTION_CONFIG[action];
  if (!config) return action.toLowerCase().replace(/_/g, ' ');
  if (action === 'TRANSITION') {
    const from = event.changes?.['step']?.[0] as string;
    const to = event.changes?.['step']?.[1] as string;
    if (from && to) return `${config.label}: ${from} → ${to}`;
  }
  return config.label;
}

interface Props {
  documentId: string;
}

export function ActivityTimeline({ documentId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['doc-activity', documentId],
    queryFn: () => getActivity(documentId, 50, 0),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const events = data?.items ?? [];

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Нет событий</p>;
  }

  return (
    <div className="flex flex-col gap-0">
      {events.map((event, i) => (
        <div key={event.id} className="flex gap-3 group">
          {/* Timeline line + icon */}
          <div className="flex flex-col items-center">
            <EventIcon action={event.action} />
            {i < events.length - 1 && (
              <div className="w-px flex-1 bg-border min-h-[16px] mt-1" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground truncate">
                {getActionLabel(event.action, event)}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true, locale: ru })}
              </span>
            </div>
            {event.actor && (
              <span className="text-[11px] text-muted-foreground">{event.actor.name}</span>
            )}
            {event.context && Object.keys(event.context).some((k) => k === 'comment') && (
              <p className="mt-1 text-[11px] text-muted-foreground italic truncate">
                «{String(event.context['comment'])}»
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
