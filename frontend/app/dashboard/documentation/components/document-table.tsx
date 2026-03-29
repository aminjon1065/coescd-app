'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, isAfter } from 'date-fns';
import {
  AlertCircle,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import axios from 'axios';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { extractListItems, ListResponse } from '@/lib/list-response';
import {
  EdmDocumentStatus,
  EdmDocumentType,
  IEdmDocument,
  IEdmSavedFilter,
  IEdmSavedFilterCriteria,
} from '@/interfaces/IEdmDocument';
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
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { CreateDocumentDialog } from './create-document-dialog';
import { DocumentationLang } from '../i18n';
import { can } from '@/features/authz/can';

type EdmDocumentsResponse = ListResponse<IEdmDocument> | IEdmDocument[];
type EdmSavedFiltersResponse = IEdmSavedFilter[] | ListResponse<IEdmSavedFilter>;

interface Props {
  title: string;
  emptyText?: string;
  lang?: DocumentationLang;
  allowCreate?: boolean;
  lockCreateType?: boolean;
  presetType?: EdmDocumentType;
  defaultDocType?: EdmDocumentType;
  source?: 'documents' | 'queue' | 'mailbox';
  queueType?: 'inbox' | 'outbox' | 'my-approvals';
  mailboxType?: 'incoming' | 'outgoing';
}

const TYPE_LABEL: Record<EdmDocumentType, string> = {
  incoming:   'Входящий',
  outgoing:   'Исходящий',
  internal:   'Внутренний',
  order:      'Приказ',
  resolution: 'Резолюция',
};

const CONFIDENTIALITY_LABEL: Record<string, string> = {
  public_internal:         'Внутренний',
  department_confidential: 'Департамент',
  restricted:              'Ограниченный',
};

// ── Row component ─────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  isApprovalQueue,
}: {
  doc: IEdmDocument;
  isApprovalQueue: boolean;
}) {
  const isOverdue =
    doc.dueAt &&
    !['approved', 'archived', 'rejected'].includes(doc.status) &&
    isAfter(new Date(), new Date(doc.dueAt));

  return (
    <tr className="group border-t hover:bg-muted/30 transition-colors">
      {/* Number */}
      <td className="w-[120px] px-3 py-3">
        <span className="font-mono text-xs font-semibold text-foreground">
          {doc.externalNumber ?? `EDM-${doc.id}`}
        </span>
      </td>

      {/* Title + subject */}
      <td className="px-3 py-3">
        <Link
          href={`/dashboard/documentation/${doc.id}`}
          className="group/link block"
        >
          <p className="font-medium text-sm leading-tight group-hover/link:text-blue-600 transition-colors line-clamp-1">
            {doc.title}
          </p>
          {(doc.subject ?? doc.summary) ? (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {doc.subject ?? doc.summary}
            </p>
          ) : null}
        </Link>
      </td>

      {/* Type */}
      <td className="hidden px-3 py-3 md:table-cell">
        <span className="text-xs text-muted-foreground">
          {TYPE_LABEL[doc.type]}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <StatusBadge status={doc.status} />
      </td>

      {/* Department */}
      <td className="hidden px-3 py-3 lg:table-cell">
        <span className="text-xs text-muted-foreground line-clamp-1">
          {doc.department?.name ?? '—'}
        </span>
      </td>

      {/* Creator */}
      <td className="hidden px-3 py-3 xl:table-cell">
        <span className="text-xs text-muted-foreground">
          {doc.creator?.name ?? '—'}
        </span>
      </td>

      {/* Due date */}
      <td className="hidden px-3 py-3 md:table-cell">
        {doc.dueAt ? (
          <span
            className={cn(
              'text-xs',
              isOverdue
                ? 'font-medium text-red-600 dark:text-red-400'
                : 'text-muted-foreground',
            )}
          >
            {format(new Date(doc.dueAt), 'dd.MM.yyyy')}
            {isOverdue ? ' !' : ''}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Updated */}
      <td className="hidden px-3 py-3 xl:table-cell">
        <span className="text-xs text-muted-foreground">
          {format(new Date(doc.updatedAt), 'dd.MM HH:mm')}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 text-right">
        {isApprovalQueue ? (
          <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
            <Link href={`/dashboard/documentation/${doc.id}`}>
              Рассмотреть
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Link href={`/dashboard/documentation/${doc.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </td>
    </tr>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <tr>
      <td colSpan={9} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-2 h-3 w-3" />
            Сбросить фильтры
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t">
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-3 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DocumentTable({
  title,
  emptyText,
  lang = 'ru',
  allowCreate = false,
  lockCreateType = false,
  presetType,
  defaultDocType,
  source = 'documents',
  queueType,
  mailboxType,
}: Props) {
  // ── State ─────────────────────────────────────────────────────────────────
  const { accessToken, user } = useAuth();
  const [documents, setDocuments] = useState<IEdmDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 25;
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | EdmDocumentStatus>('all');
  const [type, setType] = useState<'all' | EdmDocumentType>(presetType ?? 'all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [savedFilters, setSavedFilters] = useState<IEdmSavedFilter[]>([]);
  const [savedFiltersAvailable, setSavedFiltersAvailable] = useState(true);
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState<string>('all');
  const [savedFilterName, setSavedFilterName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [savingFilter, setSavingFilter] = useState(false);
  const [deletingFilter, setDeletingFilter] = useState(false);

  const isQueueSource = source === 'queue';
  const isMailboxSource = source === 'mailbox';
  const isApprovalQueue = isQueueSource && queueType === 'my-approvals';
  const canCreate = can(user, { anyPermissions: ['documents.create'] });
  const showCreate = canCreate && (source === 'documents' || allowCreate);

  const hasActiveFilters =
    q.trim() !== '' ||
    status !== 'all' ||
    (type !== 'all' && !presetType) ||
    fromDate !== '' ||
    toDate !== '';

  // ── Saved filters ──────────────────────────────────────────────────────────

  const applyCriteria = useCallback(
    (criteria: IEdmSavedFilterCriteria) => {
      setQ(criteria.q ?? '');
      setStatus(criteria.status ?? 'all');
      setType(presetType ?? criteria.type ?? 'all');
      setFromDate(criteria.fromDate ? criteria.fromDate.slice(0, 10) : '');
      setToDate(criteria.toDate ? criteria.toDate.slice(0, 10) : '');
      setPage(1);
    },
    [presetType],
  );

  const fetchSavedFilters = useCallback(async () => {
    if (isQueueSource || !savedFiltersAvailable) return;
    try {
      const res = await api.get<EdmSavedFiltersResponse>('/edm/saved-filters', {
        params: { scope: 'documents' },
      });
      const items = res.data ? extractListItems(res.data) : [];
      setSavedFilters(items);
      const def = items.find((f) => f.isDefault);
      if (def) {
        setSelectedSavedFilterId(String(def.id));
        applyCriteria(def.criteria ?? {});
      }
    } catch {
      try {
        const fb = await api.get<EdmSavedFiltersResponse>('/edm/saved-filters');
        setSavedFilters(fb.data ? extractListItems(fb.data) : []);
      } catch {
        setSavedFilters([]);
        setSavedFiltersAvailable(false);
      }
    }
  }, [applyCriteria, isQueueSource, savedFiltersAvailable]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit };
      const resolvedType = presetType ?? (type === 'all' ? undefined : type);
      if (!isQueueSource && !isMailboxSource && resolvedType) params.type = resolvedType;
      if (!isQueueSource && !isMailboxSource && status !== 'all') params.status = status;
      if (q.trim()) params.q = q.trim();
      if (!isQueueSource && !isMailboxSource && fromDate)
        params.fromDate = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
      if (!isQueueSource && !isMailboxSource && toDate)
        params.toDate = new Date(`${toDate}T23:59:59.999Z`).toISOString();

      const endpoint =
        isQueueSource && queueType
          ? `/edm/queues/${queueType}`
          : isMailboxSource && mailboxType
            ? `/edm/mailboxes/${mailboxType}`
            : '/edm/documents';

      const res = await api.get<EdmDocumentsResponse>(endpoint, { params });
      const items = res.data ? extractListItems(res.data) : [];
      setDocuments(items);
      setTotal(
        !Array.isArray(res.data) && typeof res.data.total === 'number'
          ? res.data.total
          : items.length,
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) { setError('Сессия истекла. Обновите страницу.'); return; }
        if (err.response?.status === 403) { setError('Недостаточно прав для просмотра документов.'); return; }
      }
      setError('Не удалось загрузить список документов. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, isMailboxSource, isQueueSource, limit, mailboxType, page, presetType, q, queueType, status, toDate, type]);

  useEffect(() => {
    if (presetType) setType(presetType);
  }, [presetType]);

  useEffect(() => {
    if (!accessToken) return;
    void fetchDocuments();
    if (!isQueueSource && !isMailboxSource && savedFiltersAvailable) void fetchSavedFilters();
  }, [accessToken, fetchDocuments, fetchSavedFilters, isMailboxSource, isQueueSource, savedFiltersAvailable]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

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
    if (isQueueSource || !savedFiltersAvailable || !savedFilterName.trim()) {
      if (!savedFilterName.trim()) setError('Введите имя фильтра перед сохранением.');
      return;
    }
    setSavingFilter(true);
    setError(null);
    try {
      const res = await api.post<IEdmSavedFilter>('/edm/saved-filters', {
        name: savedFilterName.trim(),
        scope: 'documents',
        isDefault: saveAsDefault,
        criteria: currentCriteria,
      });
      setSavedFilterName('');
      setSaveAsDefault(false);
      setSelectedSavedFilterId(String(res.data.id));
      await fetchSavedFilters();
    } catch {
      setError('Не удалось сохранить фильтр.');
    } finally {
      setSavingFilter(false);
    }
  };

  const updateSelectedFilter = async () => {
    if (isQueueSource || !savedFiltersAvailable || selectedSavedFilterId === 'all') return;
    setSavingFilter(true);
    try {
      await api.patch(`/edm/saved-filters/${selectedSavedFilterId}`, {
        criteria: currentCriteria,
        isDefault: saveAsDefault,
      });
      await fetchSavedFilters();
    } catch {
      setError('Не удалось обновить фильтр.');
    } finally {
      setSavingFilter(false);
    }
  };

  const deleteSelectedFilter = async () => {
    if (isQueueSource || !savedFiltersAvailable || selectedSavedFilterId === 'all') return;
    setDeletingFilter(true);
    try {
      await api.delete(`/edm/saved-filters/${selectedSavedFilterId}`);
      setSelectedSavedFilterId('all');
      setSavedFilterName('');
      await fetchSavedFilters();
    } catch {
      setError('Не удалось удалить фильтр.');
    } finally {
      setDeletingFilter(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* ── Header bar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {!loading && (
              <p className="text-xs text-muted-foreground">
                {total} {total === 1 ? 'документ' : total < 5 ? 'документа' : 'документов'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showCreate && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Создать
              </Button>
            )}
          </div>
        </div>

        {/* ── Filter toolbar ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Поиск по номеру, заголовку, теме..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          {/* Status filter */}
          {!isQueueSource && !isMailboxSource && (
            <Select
              value={status}
              onValueChange={(v: 'all' | EdmDocumentStatus) => { setStatus(v); setPage(1); }}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="draft">Черновик</SelectItem>
                <SelectItem value="in_route">На маршруте</SelectItem>
                <SelectItem value="approved">Утверждён</SelectItem>
                <SelectItem value="rejected">Отклонён</SelectItem>
                <SelectItem value="returned_for_revision">На доработке</SelectItem>
                <SelectItem value="archived">Архив</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Type filter */}
          {!isQueueSource && !isMailboxSource && !presetType && (
            <Select
              value={type}
              onValueChange={(v: 'all' | EdmDocumentType) => { setType(v); setPage(1); }}
            >
              <SelectTrigger className="h-9 w-[140px]">
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
          )}

          {/* More filters toggle */}
          {!isQueueSource && !isMailboxSource && (
            <Button
              variant="outline"
              size="sm"
              className={cn('h-9 gap-1.5', filtersOpen && 'bg-muted')}
              onClick={() => setFiltersOpen((p) => !p)}
            >
              <Filter className="h-3.5 w-3.5" />
              Фильтры
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                  !
                </span>
              )}
            </Button>
          )}

          {/* Reset */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={resetFilters}>
              <X className="h-3.5 w-3.5" />
              Сбросить
            </Button>
          )}
        </div>

        {/* ── Expanded filters panel ──────────────────────────────────── */}
        {filtersOpen && !isQueueSource && !isMailboxSource && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-wrap items-end gap-3">
              {/* Date range */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">От</Label>
                  <Input
                    type="date"
                    className="h-8 w-[140px] text-sm"
                    value={fromDate}
                    onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">До</Label>
                  <Input
                    type="date"
                    className="h-8 w-[140px] text-sm"
                    value={toDate}
                    onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                  />
                </div>
              </div>

              {/* Saved filters */}
              {savedFiltersAvailable && (
                <div className="flex flex-wrap items-end gap-2 border-l pl-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Сохранённый фильтр</Label>
                    <Select
                      value={selectedSavedFilterId}
                      onValueChange={(v) => {
                        setSelectedSavedFilterId(v);
                        if (v === 'all') { setSavedFilterName(''); setSaveAsDefault(false); return; }
                        const f = savedFilters.find((x) => String(x.id) === v);
                        if (f) { setSavedFilterName(f.name); setSaveAsDefault(f.isDefault); applyCriteria(f.criteria ?? {}); }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-sm">
                        <SelectValue placeholder="Без фильтра" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Без сохранённого фильтра</SelectItem>
                        {savedFilters.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Название</Label>
                    <Input
                      className="h-8 w-[140px] text-sm"
                      placeholder="Имя фильтра"
                      value={savedFilterName}
                      onChange={(e) => setSavedFilterName(e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={saveAsDefault}
                      onCheckedChange={(c) => setSaveAsDefault(Boolean(c))}
                    />
                    По умолчанию
                  </label>
                  <Button size="sm" className="h-8 text-xs" onClick={saveNewFilter} disabled={savingFilter || deletingFilter}>
                    {savingFilter ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Сохранить новый
                  </Button>
                  {selectedSavedFilterId !== 'all' && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={updateSelectedFilter} disabled={savingFilter || deletingFilter}>
                        Обновить
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={deleteSelectedFilter} disabled={deletingFilter}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => setError(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* ── Table ──────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">№</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Документ</th>
                <th className="hidden px-3 py-2.5 text-left text-xs font-medium text-muted-foreground md:table-cell">Тип</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Статус</th>
                <th className="hidden px-3 py-2.5 text-left text-xs font-medium text-muted-foreground lg:table-cell">Подразделение</th>
                <th className="hidden px-3 py-2.5 text-left text-xs font-medium text-muted-foreground xl:table-cell">Инициатор</th>
                <th className="hidden px-3 py-2.5 text-left text-xs font-medium text-muted-foreground md:table-cell">Срок</th>
                <th className="hidden px-3 py-2.5 text-left text-xs font-medium text-muted-foreground xl:table-cell">Обновлён</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                  {isApprovalQueue ? 'Действие' : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : documents.length === 0 ? (
                <EmptyState
                  message={emptyText ?? 'Документы не найдены по текущим фильтрам'}
                  onReset={resetFilters}
                />
              ) : (
                documents.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} isApprovalQueue={isApprovalQueue} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Страница {page} из {totalPages} · Всего {total}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Вперёд
              </Button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDocumentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={fetchDocuments}
          defaultType={defaultDocType}
          lockType={lockCreateType}
          lang={lang}
        />
      )}
    </>
  );
}
