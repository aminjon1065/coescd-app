'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { PlusIcon, SearchIcon } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { extractListItems, ListResponse } from '@/lib/list-response';
import { IEdmDocument, EdmDocumentStatus, EdmDocumentType } from '@/interfaces/IEdmDocument';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateDocumentDialog } from './create-document-dialog';

type EdmDocumentsResponse = ListResponse<IEdmDocument> | IEdmDocument[];

const statusLabel: Record<EdmDocumentStatus, string> = {
  draft: 'Черновик',
  in_route: 'На маршруте',
  approved: 'Утвержден',
  rejected: 'Отклонен',
  returned_for_revision: 'На доработке',
  archived: 'Архив',
};

const typeLabel: Record<EdmDocumentType, string> = {
  incoming: 'Входящий',
  outgoing: 'Исходящий',
  internal: 'Внутренний',
  order: 'Приказ',
  resolution: 'Резолюция',
};

const confidentialityLabel = {
  public_internal: 'Внутренний',
  department_confidential: 'Департамент',
  restricted: 'Ограниченный',
} as const;

const statusBadgeClass: Record<EdmDocumentStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-300',
  in_route: 'bg-blue-100 text-blue-700 border-blue-300',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  returned_for_revision: 'bg-amber-100 text-amber-700 border-amber-300',
  archived: 'bg-zinc-100 text-zinc-700 border-zinc-300',
};

interface Props {
  title: string;
  presetType?: EdmDocumentType;
  defaultDocType?: EdmDocumentType;
}

export function DocumentTable({ title, presetType, defaultDocType }: Props) {
  const { accessToken } = useAuth();
  const [documents, setDocuments] = useState<IEdmDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | EdmDocumentStatus>('all');
  const [type, setType] = useState<'all' | EdmDocumentType>(presetType ?? 'all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (presetType) {
      setType(presetType);
    }
  }, [presetType]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        limit,
      };

      const resolvedType = presetType ?? (type === 'all' ? undefined : type);
      if (resolvedType) {
        params.type = resolvedType;
      }
      if (status !== 'all') {
        params.status = status;
      }
      if (q.trim()) {
        params.q = q.trim();
      }
      if (fromDate) {
        params.fromDate = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
      }
      if (toDate) {
        params.toDate = new Date(`${toDate}T23:59:59.999Z`).toISOString();
      }

      const response = await api.get<EdmDocumentsResponse>('/edm/documents', { params });
      const items = extractListItems(response.data);
      setDocuments(items);
      setTotal('total' in (response.data as ListResponse<IEdmDocument>) ? (response.data as ListResponse<IEdmDocument>).total : items.length);
    } catch (err) {
      console.error('Failed to load EDM documents', err);
      setError('Не удалось загрузить журнал документов. Проверьте доступ или попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [limit, page, presetType, q, status, toDate, fromDate, type]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void fetchDocuments();
  }, [accessToken, fetchDocuments]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total]);

  const statusCounters = useMemo(() => {
    const counters: Record<EdmDocumentStatus, number> = {
      draft: 0,
      in_route: 0,
      approved: 0,
      rejected: 0,
      returned_for_revision: 0,
      archived: 0,
    };
    for (const document of documents) {
      counters[document.status] += 1;
    }
    return counters;
  }, [documents]);

  const resetFilters = () => {
    setQ('');
    setStatus('all');
    setType(presetType ?? 'all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  if (loading && documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Черновики</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{statusCounters.draft}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">На маршруте</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{statusCounters.in_route}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Утверждено</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{statusCounters.approved}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Архив</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{statusCounters.archived}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>{title}</CardTitle>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            Новая карточка
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Поиск по номеру, заголовку, теме"
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select
              value={status}
              onValueChange={(value: 'all' | EdmDocumentStatus) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="draft">Черновик</SelectItem>
                <SelectItem value="in_route">На маршруте</SelectItem>
                <SelectItem value="approved">Утвержден</SelectItem>
                <SelectItem value="rejected">Отклонен</SelectItem>
                <SelectItem value="returned_for_revision">На доработке</SelectItem>
                <SelectItem value="archived">Архив</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={type}
              onValueChange={(value: 'all' | EdmDocumentType) => {
                setType(value);
                setPage(1);
              }}
              disabled={Boolean(presetType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="incoming">Входящий</SelectItem>
                <SelectItem value="outgoing">Исходящий</SelectItem>
                <SelectItem value="internal">Внутренний</SelectItem>
                <SelectItem value="order">Приказ</SelectItem>
                <SelectItem value="resolution">Резолюция</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Всего записей: {total}</p>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">№</th>
                  <th className="px-3 py-2">Документ</th>
                  <th className="px-3 py-2">Тип</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2">Доступ</th>
                  <th className="px-3 py-2">Департамент</th>
                  <th className="px-3 py-2">Инициатор</th>
                  <th className="px-3 py-2">Срок</th>
                  <th className="px-3 py-2">Обновлен</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                      Нет документов по текущим фильтрам
                    </td>
                  </tr>
                ) : (
                  documents.map((document) => (
                    <tr key={document.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">
                        {document.externalNumber ?? `EDM-${document.id}`}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/dashboard/documentation/${document.id}`}
                          className="block hover:underline"
                        >
                          <p className="font-medium">{document.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {document.subject ?? document.summary ?? 'Без описания'}
                          </p>
                        </Link>
                      </td>
                      <td className="px-3 py-2">{typeLabel[document.type]}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={statusBadgeClass[document.status]}>
                          {statusLabel[document.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {confidentialityLabel[document.confidentiality]}
                      </td>
                      <td className="px-3 py-2">{document.department?.name ?? '—'}</td>
                      <td className="px-3 py-2">{document.creator?.name ?? '—'}</td>
                      <td className="px-3 py-2">
                        {document.dueAt ? format(new Date(document.dueAt), 'dd.MM.yyyy') : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {format(new Date(document.updatedAt), 'dd.MM.yyyy HH:mm')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Страница {page} из {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Вперёд
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreateDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchDocuments}
        defaultType={defaultDocType}
      />
    </>
  );
}
