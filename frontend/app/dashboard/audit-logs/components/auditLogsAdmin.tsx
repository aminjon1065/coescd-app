'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import Loading from '@/app/loading';
import { useAuth } from '@/context/auth-context';
import { Role } from '@/enums/RoleEnum';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }
  return fallback;
}

function sourceLabel(source: AuditLogSource): string {
  if (source === 'auth') return 'Auth';
  if (source === 'user') return 'Users';
  return 'Files';
}

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
      const params: { source?: AuditLogSource; limit: number } = {
        limit: Number(limit),
      };
      if (source !== ALL_SOURCE) {
        params.source = source as AuditLogSource;
      }
      const response = await api.get<AuditLogsResponse>('/iam/audit-logs', { params });
      setItems(response.data.items);
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to load audit logs'));
    } finally {
      setIsRefreshing(false);
    }
  }, [limit, source]);

  useEffect(() => {
    if (!accessToken) return;
    loadData().catch((error) => {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to load audit logs'));
    });
  }, [accessToken, loadData]);

  if (loading || !accessToken) {
    return <Loading />;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Access denied. Admin role is required.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {pageError ? (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">{pageError}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[180px]">
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SOURCE}>All sources</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="file">Files</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[120px]">
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger>
                  <SelectValue placeholder="Limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={loadData} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded border p-3 text-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{sourceLabel(item.source)}</Badge>
                  <Badge variant={item.success ? 'default' : 'destructive'}>
                    {item.success ? 'Success' : 'Failed'}
                  </Badge>
                  <span className="font-mono">{item.action}</span>
                  <span className="text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1 text-muted-foreground md:grid-cols-2">
                  <div>
                    Actor:{' '}
                    {item.actor
                      ? `${item.actor.name} (${item.actor.email})`
                      : 'unknown'}
                  </div>
                  <div>IP: {item.ip ?? 'unknown'}</div>
                  <div>
                    Target user:{' '}
                    {item.targetUser
                      ? `${item.targetUser.name} (${item.targetUser.email})`
                      : '-'}
                  </div>
                  <div>
                    File:{' '}
                    {item.file
                      ? `${item.file.id}: ${item.file.originalName}`
                      : '-'}
                  </div>
                  <div className="md:col-span-2">Reason: {item.reason ?? '-'}</div>
                  <div className="md:col-span-2 break-all">
                    User-Agent: {item.userAgent ?? '-'}
                  </div>
                  {item.details ? (
                    <div className="md:col-span-2 overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                      {JSON.stringify(item.details)}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {!items.length ? (
              <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                No logs found for selected filters.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
