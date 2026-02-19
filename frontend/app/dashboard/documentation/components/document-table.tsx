'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { PlusIcon, SearchIcon, TrashIcon } from 'lucide-react';
import axios from 'axios';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { extractListItems, ListResponse } from '@/lib/list-response';
import {
  IEdmDocument,
  IEdmSavedFilter,
  IEdmSavedFilterCriteria,
  EdmDocumentStatus,
  EdmDocumentType,
} from '@/interfaces/IEdmDocument';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateDocumentDialog } from './create-document-dialog';

type EdmDocumentsResponse = ListResponse<IEdmDocument> | IEdmDocument[];
type EdmSavedFiltersResponse = IEdmSavedFilter[] | ListResponse<IEdmSavedFilter>;

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
  source?: 'documents' | 'queue';
  queueType?: 'inbox' | 'outbox' | 'my-approvals';
}

export function DocumentTable({
  title,
  presetType,
  defaultDocType,
  source = 'documents',
  queueType,
}: Props) {
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
  const [savedFilters, setSavedFilters] = useState<IEdmSavedFilter[]>([]);
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState<string>('all');
  const [savedFilterName, setSavedFilterName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [savingFilter, setSavingFilter] = useState(false);
  const [deletingFilter, setDeletingFilter] = useState(false);
  const isQueueSource = source === 'queue';
  const showCreateAction = source === 'documents';

  useEffect(() => {
    if (presetType) {
      setType(presetType);
    }
  }, [presetType]);

  const applyCriteria = useCallback(
    (criteria: IEdmSavedFilterCriteria) => {
      setQ(criteria.q ?? '');
      setStatus(criteria.status ?? 'all');
      if (presetType) {
        setType(presetType);
      } else {
        setType(criteria.type ?? 'all');
      }
      setFromDate(criteria.fromDate ? criteria.fromDate.slice(0, 10) : '');
      setToDate(criteria.toDate ? criteria.toDate.slice(0, 10) : '');
      setPage(1);
    },
    [presetType],
  );

  const fetchSavedFilters = useCallback(async () => {
    if (isQueueSource) {
      return;
    }
    try {
      const response = await api.get<EdmSavedFiltersResponse>('/edm/saved-filters', {
        params: { scope: 'documents' },
      });
      const payload = response.data;
      const items = payload ? extractListItems(payload) : [];
      setSavedFilters(items);
      const defaultFilter = items.find((item) => item.isDefault);
      if (defaultFilter) {
        setSelectedSavedFilterId(String(defaultFilter.id));
        applyCriteria(defaultFilter.criteria ?? {});
      }
    } catch (err) {
      console.error('Failed to load saved EDM filters', err);
    }
  }, [applyCriteria, isQueueSource]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        limit,
      };

      const resolvedType = presetType ?? (type === 'all' ? undefined : type);
      if (!isQueueSource && resolvedType) {
        params.type = resolvedType;
      }
      if (!isQueueSource && status !== 'all') {
        params.status = status;
      }
      if (q.trim()) {
        params.q = q.trim();
      }
      if (!isQueueSource && fromDate) {
        params.fromDate = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
      }
      if (!isQueueSource && toDate) {
        params.toDate = new Date(`${toDate}T23:59:59.999Z`).toISOString();
      }

      const endpoint =
        isQueueSource && queueType ? `/edm/queues/${queueType}` : '/edm/documents';
      const response = await api.get<EdmDocumentsResponse>(endpoint, { params });
      const payload = response.data;
      const items = payload ? extractListItems(payload) : [];
      setDocuments(items);
      setTotal(
        payload && !Array.isArray(payload) && typeof payload.total === 'number'
          ? payload.total
          : items.length,
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Сессия истекла. Обновите страницу и войдите снова.');
          return;
        }
        if (err.response?.status === 403) {
          setError('У вас недостаточно прав для просмотра журнала документов.');
          return;
        }
      }
      setError('Не удалось загрузить журнал документов. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, isQueueSource, limit, page, presetType, q, queueType, status, toDate, type]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void fetchDocuments();
    if (!isQueueSource) {
      void fetchSavedFilters();
    }
  }, [accessToken, fetchDocuments, fetchSavedFilters, isQueueSource]);

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
    setSelectedSavedFilterId('all');
    setSavedFilterName('');
    setSaveAsDefault(false);
  };

  const currentCriteria = useMemo<IEdmSavedFilterCriteria>(
    () => ({
      status: status === 'all' ? undefined : status,
      type: presetType ? presetType : type === 'all' ? undefined : type,
      q: q.trim() || undefined,
      fromDate: fromDate ? new Date(`${fromDate}T00:00:00.000Z`).toISOString() : undefined,
      toDate: toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : undefined,
    }),
    [fromDate, presetType, q, status, toDate, type],
  );

  const saveNewFilter = async () => {
    if (isQueueSource) {
      return;
    }
    if (!savedFilterName.trim()) {
      setError('Введите имя фильтра перед сохранением.');
      return;
    }
    setSavingFilter(true);
    setError(null);
    try {
      const response = await api.post<IEdmSavedFilter>('/edm/saved-filters', {
        name: savedFilterName.trim(),
        scope: 'documents',
        isDefault: saveAsDefault,
        criteria: currentCriteria,
      });
      const created = response.data;
      setSavedFilterName('');
      setSaveAsDefault(false);
      setSelectedSavedFilterId(String(created.id));
      await fetchSavedFilters();
    } catch (err) {
      console.error('Failed to save EDM filter', err);
      setError('Не удалось сохранить фильтр.');
    } finally {
      setSavingFilter(false);
    }
  };

  const updateSelectedFilter = async () => {
    if (isQueueSource || selectedSavedFilterId === 'all') {
      return;
    }
    setSavingFilter(true);
    setError(null);
    try {
      await api.patch(`/edm/saved-filters/${selectedSavedFilterId}`, {
        criteria: currentCriteria,
        isDefault: saveAsDefault,
      });
      await fetchSavedFilters();
    } catch (err) {
      console.error('Failed to update EDM filter', err);
      setError('Не удалось обновить выбранный фильтр.');
    } finally {
      setSavingFilter(false);
    }
  };

  const deleteSelectedFilter = async () => {
    if (isQueueSource || selectedSavedFilterId === 'all') {
      return;
    }
    setDeletingFilter(true);
    setError(null);
    try {
      await api.delete(`/edm/saved-filters/${selectedSavedFilterId}`);
      setSelectedSavedFilterId('all');
      setSavedFilterName('');
      setSaveAsDefault(false);
      await fetchSavedFilters();
    } catch (err) {
      console.error('Failed to delete EDM filter', err);
      setError('Не удалось удалить выбранный фильтр.');
    } finally {
      setDeletingFilter(false);
    }
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
          {showCreateAction ? (
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Новая карточка
            </Button>
          ) : null}
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

            {!isQueueSource ? (
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
            ) : null}

            {!isQueueSource ? (
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
            ) : null}

            {!isQueueSource ? (
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setPage(1);
                }}
              />
            ) : null}
            {!isQueueSource ? (
              <Input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setPage(1);
                }}
              />
            ) : null}
          </div>

          {!isQueueSource ? (
            <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2 lg:grid-cols-6">
              <Select
                value={selectedSavedFilterId}
                onValueChange={(value) => {
                  setSelectedSavedFilterId(value);
                  if (value === 'all') {
                    setSavedFilterName('');
                    setSaveAsDefault(false);
                    return;
                  }
                  const selected = savedFilters.find((item) => String(item.id) === value);
                  if (!selected) {
                    return;
                  }
                  setSavedFilterName(selected.name);
                  setSaveAsDefault(selected.isDefault);
                  applyCriteria(selected.criteria ?? {});
                }}
              >
                <SelectTrigger className="lg:col-span-2">
                  <SelectValue placeholder="Сохранённые фильтры" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Без сохранённого фильтра</SelectItem>
                  {savedFilters.map((filter) => (
                    <SelectItem key={filter.id} value={String(filter.id)}>
                      {filter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                className="lg:col-span-2"
                placeholder="Название фильтра"
                value={savedFilterName}
                onChange={(event) => setSavedFilterName(event.target.value)}
              />

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={saveAsDefault}
                  onCheckedChange={(checked) => setSaveAsDefault(Boolean(checked))}
                />
                <Label>По умолчанию</Label>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={saveNewFilter} disabled={savingFilter || deletingFilter}>
                  {savingFilter ? 'Сохранение...' : 'Сохранить новый'}
                </Button>
                {selectedSavedFilterId !== 'all' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={updateSelectedFilter}
                      disabled={savingFilter || deletingFilter}
                    >
                      {savingFilter ? 'Обновление...' : 'Обновить'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={deleteSelectedFilter}
                      disabled={savingFilter || deletingFilter}
                    >
                      <TrashIcon className="mr-1 h-4 w-4" />
                      {deletingFilter ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

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

      {showCreateAction ? (
        <CreateDocumentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={fetchDocuments}
          defaultType={defaultDocType}
        />
      ) : null}
    </>
  );
}
