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
import { DocumentationLang } from '../i18n';
import { can } from '@/features/authz/can';

type EdmDocumentsResponse = ListResponse<IEdmDocument> | IEdmDocument[];
type EdmSavedFiltersResponse = IEdmSavedFilter[] | ListResponse<IEdmSavedFilter>;

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

const labels = {
  ru: {
    noDocumentsForFilters: 'Документы не найдены по текущим фильтрам',
    sessionExpired: 'Сессия истекла. Обновите страницу и войдите снова.',
    noRights: 'У вас недостаточно прав для просмотра журнала документов.',
    loadFailed: 'Не удалось загрузить журнал документов. Попробуйте позже.',
    enterFilterName: 'Введите имя фильтра перед сохранением.',
    saveFilterFailed: 'Не удалось сохранить фильтр.',
    updateFilterFailed: 'Не удалось обновить выбранный фильтр.',
    deleteFilterFailed: 'Не удалось удалить выбранный фильтр.',
    draft: 'Черновики',
    inRoute: 'На маршруте',
    approved: 'Утверждено',
    archived: 'Архив',
    createDocument: 'Создать документ',
    search: 'Поиск по номеру, заголовку, теме',
    status: 'Статус',
    type: 'Тип',
    allStatuses: 'Все статусы',
    allTypes: 'Все типы',
    statusDraft: 'Черновик',
    statusInRoute: 'На маршруте',
    statusApproved: 'Утвержден',
    statusRejected: 'Отклонен',
    statusReturned: 'На доработке',
    statusArchived: 'Архив',
    typeIncoming: 'Входящий',
    typeOutgoing: 'Исходящий',
    typeInternal: 'Внутренний',
    typeOrder: 'Приказ',
    typeResolution: 'Резолюция',
    confidentialityPublic: 'Внутренний',
    confidentialityDepartment: 'Департамент',
    confidentialityRestricted: 'Ограниченный',
    savedFilters: 'Сохраненные фильтры',
    noSavedFilter: 'Без сохраненного фильтра',
    filterName: 'Название фильтра',
    byDefault: 'По умолчанию',
    saving: 'Сохранение...',
    saveNew: 'Сохранить новый',
    updating: 'Обновление...',
    update: 'Обновить',
    deleting: 'Удаление...',
    delete: 'Удалить',
    totalRecords: 'Всего записей',
    resetFilters: 'Сбросить фильтры',
    document: 'Документ',
    kind: 'Тип (справ.)',
    access: 'Доступ',
    department: 'Департамент',
    initiator: 'Инициатор',
    dueDate: 'Срок',
    updatedAt: 'Обновлен',
    noDescription: 'Без описания',
    page: 'Страница',
    of: 'из',
    back: 'Назад',
    next: 'Вперед',
  },
  tj: {
    noDocumentsForFilters: 'Ҳуҷҷатҳо бо филтрҳои ҷорӣ ёфт нашуданд',
    sessionExpired: 'Сессия ба анҷом расид. Саҳифаро навсозӣ кунед ва дубора ворид шавед.',
    noRights: 'Шумо барои дидани дафтари ҳуҷҷатҳо ҳуқуқи кофӣ надоред.',
    loadFailed: 'Боркунии дафтари ҳуҷҷатҳо муяссар нашуд. Баъдтар кӯшиш кунед.',
    enterFilterName: 'Пеш аз захира номи филтрро ворид кунед.',
    saveFilterFailed: 'Захира кардани филтр муяссар нашуд.',
    updateFilterFailed: 'Навсозии филтри интихобшуда муяссар нашуд.',
    deleteFilterFailed: 'Ҳазфи филтри интихобшуда муяссар нашуд.',
    draft: 'Лоиҳаҳо',
    inRoute: 'Дар масир',
    approved: 'Тасдиқшуда',
    archived: 'Бойгонӣ',
    createDocument: 'Эҷоди ҳуҷҷат',
    search: 'Ҷустуҷӯ аз рӯйи рақам, сарлавҳа, мавзӯъ',
    status: 'Ҳолат',
    type: 'Навъ',
    allStatuses: 'Ҳама ҳолатҳо',
    allTypes: 'Ҳама намудҳо',
    statusDraft: 'Лоиҳа',
    statusInRoute: 'Дар масир',
    statusApproved: 'Тасдиқшуда',
    statusRejected: 'Радшуда',
    statusReturned: 'Барои такмил',
    statusArchived: 'Бойгонӣ',
    typeIncoming: 'Воридотӣ',
    typeOutgoing: 'Содиротӣ',
    typeInternal: 'Дохилӣ',
    typeOrder: 'Фармон',
    typeResolution: 'Қатънома',
    confidentialityPublic: 'Дохилӣ',
    confidentialityDepartment: 'Департамент',
    confidentialityRestricted: 'Маҳдуд',
    savedFilters: 'Филтрҳои захирашуда',
    noSavedFilter: 'Бе филтри захирашуда',
    filterName: 'Номи филтр',
    byDefault: 'Пешфарз',
    saving: 'Дар ҳоли захира...',
    saveNew: 'Захираи нав',
    updating: 'Дар ҳоли навсозӣ...',
    update: 'Навсозӣ',
    deleting: 'Дар ҳоли ҳазф...',
    delete: 'Ҳазф',
    totalRecords: 'Ҳамагӣ сабтҳо',
    resetFilters: 'Тозакунии филтрҳо',
    document: 'Ҳуҷҷат',
    kind: 'Навъ (феҳрист)',
    access: 'Дастрасӣ',
    department: 'Департамент',
    initiator: 'Ибтикоркунанда',
    dueDate: 'Муҳлат',
    updatedAt: 'Навсозӣ шуд',
    noDescription: 'Бе тавсиф',
    page: 'Саҳифа',
    of: 'аз',
    back: 'Қафо',
    next: 'Пеш',
  },
} as const;

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
  const t = labels[lang];
  const statusLabel: Record<EdmDocumentStatus, string> = {
    draft: t.statusDraft,
    in_route: t.statusInRoute,
    approved: t.statusApproved,
    rejected: t.statusRejected,
    returned_for_revision: t.statusReturned,
    archived: t.statusArchived,
  };
  const typeLabel: Record<EdmDocumentType, string> = {
    incoming: t.typeIncoming,
    outgoing: t.typeOutgoing,
    internal: t.typeInternal,
    order: t.typeOrder,
    resolution: t.typeResolution,
  };
  const confidentialityLabel = {
    public_internal: t.confidentialityPublic,
    department_confidential: t.confidentialityDepartment,
    restricted: t.confidentialityRestricted,
  } as const;
  const { accessToken, user } = useAuth();
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
  const [savedFiltersAvailable, setSavedFiltersAvailable] = useState(true);
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState<string>('all');
  const [savedFilterName, setSavedFilterName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [savingFilter, setSavingFilter] = useState(false);
  const [deletingFilter, setDeletingFilter] = useState(false);
  const isQueueSource = source === 'queue';
  const isMailboxSource = source === 'mailbox';
  const canCreateDocuments = can(user, {
    anyPermissions: ['documents.create'],
  });
  const showCreateAction = canCreateDocuments && (source === 'documents' || allowCreate);

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
    if (isQueueSource || !savedFiltersAvailable) {
      return;
    }
    try {
      const response = await api.get<EdmSavedFiltersResponse>('/edm/saved-filters', {
        params: { scope: 'documents' },
      });
      const payload = response.data;
      const items = payload ? extractListItems(payload) : [];
      setSavedFilters(items);
      setSavedFiltersAvailable(true);
      const defaultFilter = items.find((item) => item.isDefault);
      if (defaultFilter) {
        setSelectedSavedFilterId(String(defaultFilter.id));
        applyCriteria(defaultFilter.criteria ?? {});
      }
    } catch (err) {
      if (!axios.isAxiosError(err)) {
        console.error('Failed to load saved EDM filters', err);
        return;
      }

      try {
        const fallbackResponse = await api.get<EdmSavedFiltersResponse>('/edm/saved-filters');
        const fallbackPayload = fallbackResponse.data;
        const fallbackItems = fallbackPayload ? extractListItems(fallbackPayload) : [];
        setSavedFilters(fallbackItems);
        setSavedFiltersAvailable(true);
      } catch (fallbackErr) {
        console.error('Saved EDM filters endpoint is unavailable', fallbackErr);
        setSavedFilters([]);
        setSavedFiltersAvailable(false);
      }
    }
  }, [applyCriteria, isQueueSource, savedFiltersAvailable]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        limit,
      };

      const resolvedType = presetType ?? (type === 'all' ? undefined : type);
      if (!isQueueSource && !isMailboxSource && resolvedType) {
        params.type = resolvedType;
      }
      if (!isQueueSource && !isMailboxSource && status !== 'all') {
        params.status = status;
      }
      if (q.trim()) {
        params.q = q.trim();
      }
      if (!isQueueSource && !isMailboxSource && fromDate) {
        params.fromDate = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
      }
      if (!isQueueSource && !isMailboxSource && toDate) {
        params.toDate = new Date(`${toDate}T23:59:59.999Z`).toISOString();
      }

      const endpoint = isQueueSource && queueType
        ? `/edm/queues/${queueType}`
        : isMailboxSource && mailboxType
          ? `/edm/mailboxes/${mailboxType}`
          : '/edm/documents';
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
          setError(t.sessionExpired);
          return;
        }
        if (err.response?.status === 403) {
          setError(t.noRights);
          return;
        }
      }
      setError(t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [
    fromDate,
    isMailboxSource,
    isQueueSource,
    limit,
    mailboxType,
    page,
    presetType,
    q,
    queueType,
    status,
    t.loadFailed,
    t.noRights,
    t.sessionExpired,
    toDate,
    type,
  ]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void fetchDocuments();
    if (!isQueueSource && !isMailboxSource && savedFiltersAvailable) {
      void fetchSavedFilters();
    }
  }, [
    accessToken,
    fetchDocuments,
    fetchSavedFilters,
    isMailboxSource,
    isQueueSource,
    savedFiltersAvailable,
  ]);

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
    if (isQueueSource || !savedFiltersAvailable) {
      return;
    }
    if (!savedFilterName.trim()) {
      setError(t.enterFilterName);
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
      setError(t.saveFilterFailed);
    } finally {
      setSavingFilter(false);
    }
  };

  const updateSelectedFilter = async () => {
    if (isQueueSource || !savedFiltersAvailable || selectedSavedFilterId === 'all') {
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
      setError(t.updateFilterFailed);
    } finally {
      setSavingFilter(false);
    }
  };

  const deleteSelectedFilter = async () => {
    if (isQueueSource || !savedFiltersAvailable || selectedSavedFilterId === 'all') {
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
      setError(t.deleteFilterFailed);
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
            <CardTitle className="text-sm">{t.draft}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{statusCounters.draft}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.inRoute}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{statusCounters.in_route}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.approved}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{statusCounters.approved}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.archived}</CardTitle>
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
              {t.createDocument}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={t.search}
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            {!isQueueSource && !isMailboxSource ? (
              <Select
                value={status}
                onValueChange={(value: 'all' | EdmDocumentStatus) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allStatuses}</SelectItem>
                  <SelectItem value="draft">{t.statusDraft}</SelectItem>
                  <SelectItem value="in_route">{t.statusInRoute}</SelectItem>
                  <SelectItem value="approved">{t.statusApproved}</SelectItem>
                  <SelectItem value="rejected">{t.statusRejected}</SelectItem>
                  <SelectItem value="returned_for_revision">{t.statusReturned}</SelectItem>
                  <SelectItem value="archived">{t.statusArchived}</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            {!isQueueSource && !isMailboxSource ? (
              <Select
                value={type}
                onValueChange={(value: 'all' | EdmDocumentType) => {
                  setType(value);
                  setPage(1);
                }}
                disabled={Boolean(presetType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.type} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allTypes}</SelectItem>
                  <SelectItem value="incoming">{t.typeIncoming}</SelectItem>
                  <SelectItem value="outgoing">{t.typeOutgoing}</SelectItem>
                  <SelectItem value="internal">{t.typeInternal}</SelectItem>
                  <SelectItem value="order">{t.typeOrder}</SelectItem>
                  <SelectItem value="resolution">{t.typeResolution}</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            {!isQueueSource && !isMailboxSource ? (
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setPage(1);
                }}
              />
            ) : null}
            {!isQueueSource && !isMailboxSource ? (
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

          {!isQueueSource && !isMailboxSource && savedFiltersAvailable ? (
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
                  <SelectValue placeholder={t.savedFilters} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.noSavedFilter}</SelectItem>
                  {savedFilters.map((filter) => (
                    <SelectItem key={filter.id} value={String(filter.id)}>
                      {filter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                className="lg:col-span-2"
                placeholder={t.filterName}
                value={savedFilterName}
                onChange={(event) => setSavedFilterName(event.target.value)}
              />

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={saveAsDefault}
                  onCheckedChange={(checked) => setSaveAsDefault(Boolean(checked))}
                />
                <Label>{t.byDefault}</Label>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={saveNewFilter} disabled={savingFilter || deletingFilter}>
                  {savingFilter ? t.saving : t.saveNew}
                </Button>
                {selectedSavedFilterId !== 'all' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={updateSelectedFilter}
                      disabled={savingFilter || deletingFilter}
                    >
                      {savingFilter ? t.updating : t.update}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={deleteSelectedFilter}
                      disabled={savingFilter || deletingFilter}
                    >
                      <TrashIcon className="mr-1 h-4 w-4" />
                      {deletingFilter ? t.deleting : t.delete}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t.totalRecords}: {total}</p>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              {t.resetFilters}
            </Button>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">№</th>
                  <th className="px-3 py-2">{t.document}</th>
                  <th className="px-3 py-2">{t.type}</th>
                  <th className="px-3 py-2">{t.kind}</th>
                  <th className="px-3 py-2">{t.status}</th>
                  <th className="px-3 py-2">{t.access}</th>
                  <th className="px-3 py-2">{t.department}</th>
                  <th className="px-3 py-2">{t.initiator}</th>
                  <th className="px-3 py-2">{t.dueDate}</th>
                  <th className="px-3 py-2">{t.updatedAt}</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                      {emptyText ?? t.noDocumentsForFilters}
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
                            {document.subject ?? document.summary ?? t.noDescription}
                          </p>
                        </Link>
                      </td>
                      <td className="px-3 py-2">{typeLabel[document.type]}</td>
                      <td className="px-3 py-2">{document.documentKind?.name ?? '—'}</td>
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
              {t.page} {page} {t.of} {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {t.back}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                {t.next}
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
          lockType={lockCreateType}
          lang={lang}
        />
      ) : null}
    </>
  );
}


