'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { ICall, CallStatus } from '@/interfaces/ICall';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowDownLeft, ArrowUpRight, Phone, Video } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/context/auth-context';

interface PaginatedCalls {
  items: ICall[];
  total: number;
  page: number;
  limit: number;
}

const statusLabel: Record<CallStatus, string> = {
  pending:  'Ожидание',
  active:   'Активный',
  ended:    'Завершён',
  missed:   'Пропущен',
  rejected: 'Отклонён',
};

const statusBadgeClass: Record<CallStatus, string> = {
  pending:  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  active:   'bg-green-500/15 text-green-700 dark:text-green-400',
  ended:    'bg-muted text-muted-foreground',
  missed:   'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  rejected: 'bg-destructive/15 text-destructive',
};

function formatDuration(sec: number | null): string {
  if (sec === null || sec === undefined) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function CallHistoryTable() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<ICall[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchCalls = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedCalls>('/calls', {
        params: { page: p, limit },
      });
      setCalls(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to load calls', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Собеседник</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Длительность</TableHead>
            <TableHead>Дата</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : calls.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                История звонков пуста
              </TableCell>
            </TableRow>
          ) : (
            calls.map((call) => {
              const isOutgoing = call.initiator?.id === user?.id;
              const other = isOutgoing ? call.receiver : call.initiator;
              const otherName = other?.name ?? 'Неизвестный';

              return (
                <TableRow key={call.id}>
                  {/* Direction */}
                  <TableCell>
                    {isOutgoing ? (
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-primary" />
                    )}
                  </TableCell>

                  {/* Participant */}
                  <TableCell className="font-medium">{otherName}</TableCell>

                  {/* Call type */}
                  <TableCell>
                    {call.hasVideo ? (
                      <Video className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass[call.status]}
                    >
                      {statusLabel[call.status]}
                    </Badge>
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="tabular-nums">
                    {formatDuration(call.durationSec)}
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-sm text-muted-foreground">
                    {format(parseISO(call.createdAt), 'd MMM yyyy, HH:mm', {
                      locale: ru,
                    })}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
}
