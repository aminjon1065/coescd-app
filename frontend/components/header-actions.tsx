'use client';

import { Bell, Search, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useUnreadNotificationCount,
  useNotificationsQuery,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/queries/useNotifications';

const KIND_LABELS: Record<string, string> = {
  task_assigned: 'Новая задача',
  task_updated: 'Задача обновлена',
  document_routed: 'Документ направлен',
  edm_alert: 'Оповещение СЭД',
  call_incoming: 'Входящий звонок',
  system: 'Системное',
};

export function HeaderActions() {
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notificationsData } = useNotificationsQuery(false, true);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsData?.items ?? [];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* ── Global search trigger ─────────────────────────────────────── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-muted-foreground"
              aria-label="Поиск"
            >
              <Search className="h-4 w-4" />
              <span className="hidden text-xs text-muted-foreground/70 md:inline">
                ⌘K
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Глобальный поиск (⌘K)</TooltipContent>
        </Tooltip>

        {/* ── Notification bell ─────────────────────────────────────────── */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-8 w-8 p-0 text-muted-foreground"
                  aria-label="Уведомления"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span
                      className={cn(
                        'absolute right-1 top-1 flex h-4 w-4 items-center justify-center',
                        'rounded-full bg-red-500 text-[10px] font-bold text-white',
                      )}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Уведомления</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Уведомления</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto gap-1 p-0 text-xs text-muted-foreground"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  <CheckCheck className="h-3 w-3" />
                  Прочитать все
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Новых уведомлений нет
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {notifications.slice(0, 10).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={cn(
                      'flex flex-col items-start gap-0.5 px-3 py-2',
                      !n.readAt && 'bg-muted/40',
                    )}
                    onClick={() => {
                      if (!n.readAt) markRead.mutate(n.id);
                    }}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-medium">
                        {KIND_LABELS[n.kind] ?? n.kind}
                      </span>
                      {!n.readAt && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {n.message}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(n.createdAt).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
