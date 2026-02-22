'use client';

import { useEffect, useRef } from 'react';
import { IChatMessage } from '@/interfaces/IChatMessage';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface MessageListProps {
  messages: IChatMessage[];
  currentUserId?: number;
  loading: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function formatDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Сегодня';
  if (isYesterday(date)) return 'Вчера';
  return format(date, 'd MMMM yyyy', { locale: ru });
}

function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm');
}

function groupByDate(messages: IChatMessage[]): Array<{ label: string; items: IChatMessage[] }> {
  const groups: Array<{ label: string; items: IChatMessage[] }> = [];
  let currentLabel = '';
  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, items: [] });
    }
    groups[groups.length - 1].items.push(msg);
  }
  return groups;
}

export function MessageList({ messages, currentUserId, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-64" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Нет сообщений. Напишите первым!
      </div>
    );
  }

  const groups = groupByDate(messages);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      {groups.map((group) => (
        <div key={group.label}>
          {/* Date separator */}
          <div className="my-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{group.label}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Messages */}
          {group.items.map((msg) => {
            const isOwn = msg.sender?.id === currentUserId;
            const senderName = msg.sender?.name ?? 'Система';
            return (
              <div
                key={msg.id}
                className={cn(
                  'mb-3 flex items-start gap-3',
                  isOwn && 'flex-row-reverse',
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                    isOwn ? 'bg-primary' : 'bg-muted-foreground/60',
                  )}
                  title={senderName}
                >
                  {getInitials(senderName)}
                </div>

                {/* Bubble */}
                <div className={cn('max-w-[70%]', isOwn && 'items-end')}>
                  {!isOwn && (
                    <p className="mb-0.5 text-xs font-medium text-muted-foreground">
                      {senderName}
                    </p>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2 text-sm leading-relaxed',
                      isOwn
                        ? 'rounded-tr-sm bg-primary text-primary-foreground'
                        : 'rounded-tl-sm bg-muted text-foreground',
                    )}
                  >
                    {msg.content}
                  </div>
                  <p
                    className={cn(
                      'mt-0.5 text-[11px] text-muted-foreground',
                      isOwn && 'text-right',
                    )}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
