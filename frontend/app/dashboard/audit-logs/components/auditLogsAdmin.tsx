'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import Loading from '@/app/loading';
import { useAuth } from '@/context/auth-context';
import { Role } from '@/enums/RoleEnum';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

const ALL_SOURCE = '__all__';

type AuditLogSource = 'auth' | 'user' | 'file';

type AuditLogItem = {
  id: string;
  source: AuditLogSource;
  action: string;
  success: boolean;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
  reason: string | null;
  actor: { id: number; email: string; name: string } | null;
  targetUser: { id: number; email: string; name: string } | null;
  file: { id: number; originalName: string } | null;
  details: Record<string, unknown> | null;
};

type AuditLogsResponse = {
  total: number;
  items: AuditLogItem[];
};

// ── Label maps ────────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<AuditLogSource, string> = {
  auth: 'Аутентификация',
  user: 'Пользователи',
  file: 'Файлы',
};

const SOURCE_CLASSES: Record<AuditLogSource, string> = {
  auth:  'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  user:  'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  file:  'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

// ── Helper ────────────────────────────────────────────────────────────────────

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

// ── Log item ──────────────────────────────────────────────────────────────────

function LogItem({ item }: { item: AuditLogItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border text-sm transition-colors',
        item.success ? 'border-border' : 'border-red-200 dark:border-red-900',
      )}
    >
      {/* Summary row */}
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Success/fail icon */}
        <div className="mt-0.5 shrink-0">
          {item.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          {/* Source badge */}
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/10',
              SOURCE_CLASSES[item.source],
            )}
          >
            {SOURCE_LABEL[item.source]}
          </span>
          {/* Action */}
          <span className="font-mono text-xs font-medium">{item.action}</span>
          {/* Actor */}
          {item.actor && (
            <span className="text-xs text-muted-foreground truncate">
              {item.actor.name}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="shrink-0 text-xs text-muted-foreground">
          {format(parseISO(item.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 py-3 text-xs text-muted-foreground space-y-1.5">
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <div>
              <span className="font-medium">Исполнитель:</span>{' '}
              {item.actor ? `${item.actor.name} (${item.actor.email})` : 'неизвестно'}
            </div>
            <div>
              <span className="font-medium">IP:</span> {item.ip ?? 'неизвестно'}
            </div>
            {item.targetUser && (
              <div>
                <span className="font-medium">Целевой пользователь:</span>{' '}
                {item.targetUser.name} ({item.targetUser.email})
              </div>
            )}
            {item.file && (
              <div>
                <span className="font-medium">Файл:</span>{' '}
                #{item.file.id}: {item.file.originalName}
              </div>
            )}
            {item.reason && (
              <div className="md:col-span-2">
                <span className="font-medium">Причина:</span> {item.reason}
              </div>
            )}
            {item.userAgent && (
              <div className="md:col-span-2 break-all">
                <span className="font-medium">User-Agent:</span> {item.userAgent}
              </div>
            )}
          </div>
          {item.details && (
            <div className="overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
              {JSON.stringify(item.details, null, 2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AuditLogsAdmin() {
  const { loading, accessToken, user } = useAuth();
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [source, setSource] = useState<string>(ALL_SOURCE);
  const [limit, setLimit] = useState<string>('100');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const isAdmin = useMemo(() => user?.role === Role.Admin, [user?.role]);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    setPageError(null);
    try {
      const params: { source?: AuditLogSource; limit: number } = { limit: Number(limit) };
      if (source !== ALL_SOURCE) params.source = source as AuditLogSource;
      const response = await api.get<AuditLogsResponse>('/iam/audit-logs', { params });
      setItems(response.data.items);
    } catch (error: unknown) {
      setPageError(getApiErrorMessage(error, 'Не удалось загрузить журнал аудита'));
    } finally {
      setIsRefreshing(false);
    }
  }, [limit, source]);

  useEffect(() => {
    if (!accessToken) return;
    loadData().catch(console.error);
  }, [accessToken, loadData]);

  if (loading || !accessToken) return <Loading />;

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Доступ запрещён. Требуется роль Администратора.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {pageError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {pageError}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Журнал аудита</CardTitle>
              {items.length > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Показано: {items.length}
                </p>
              )}
            </div>

            {/* Filters + refresh */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Источник" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SOURCE}>Все источники</SelectItem>
                  <SelectItem value="auth">Аутентификация</SelectItem>
                  <SelectItem value="user">Пользователи</SelectItem>
                  <SelectItem value="file">Файлы</SelectItem>
                </SelectContent>
              </Select>

              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger className="w-[80px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={loadData}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Загрузка...' : 'Обновить'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Записи не найдены
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => (
                <LogItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
