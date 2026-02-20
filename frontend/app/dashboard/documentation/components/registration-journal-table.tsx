'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { SearchIcon } from 'lucide-react';
import { edmApi } from '@/lib/edm';
import { useAuth } from '@/context/auth-context';
import {
  EdmRegistrationJournalType,
  EdmRegistrationStatus,
  IEdmRegistrationJournalRecord,
} from '@/interfaces/IEdmDocument';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentationLang } from '../i18n';

const labels = {
  ru: {
    title: 'Журнал регистрации',
    search: 'Регистрационный номер',
    allTypes: 'Все типы',
    allStatuses: 'Все статусы',
    incoming: 'Входящие',
    outgoing: 'Исходящие',
    registered: 'Зарегистрирован',
    cancelled: 'Отменен',
    reset: 'Сброс',
    noRecords: 'Записи не найдены',
    number: 'Номер',
    type: 'Тип',
    status: 'Статус',
    document: 'Документ',
    department: 'Департамент',
    registeredAt: 'Дата регистрации',
    page: 'Страница',
    of: 'из',
    back: 'Назад',
    next: 'Вперед',
    loadError: 'Не удалось загрузить журнал регистрации',
  },
  tj: {
    title: 'Дафтари бақайдгирӣ',
    search: 'Рақами бақайдгирӣ',
    allTypes: 'Ҳама намудҳо',
    allStatuses: 'Ҳама ҳолатҳо',
    incoming: 'Воридот',
    outgoing: 'Содирот',
    registered: 'Бақайд гирифта шуд',
    cancelled: 'Бекор шуд',
    reset: 'Аз нав',
    noRecords: 'Сабтҳо ёфт нашуданд',
    number: 'Рақам',
    type: 'Навъ',
    status: 'Ҳолат',
    document: 'Ҳуҷҷат',
    department: 'Департамент',
    registeredAt: 'Санаи бақайдгирӣ',
    page: 'Саҳифа',
    of: 'аз',
    back: 'Қафо',
    next: 'Пеш',
    loadError: 'Боркунии дафтари бақайдгирӣ номумкин аст',
  },
} as const;

type Props = {
  lang?: DocumentationLang;
};

export function RegistrationJournalTable({ lang = 'ru' }: Props) {
  const t = labels[lang];
  const journalTypeLabel: Record<EdmRegistrationJournalType, string> = {
    incoming: t.incoming,
    outgoing: t.outgoing,
  };
  const registrationStatusLabel: Record<EdmRegistrationStatus, string> = {
    registered: t.registered,
    cancelled: t.cancelled,
  };

  const { accessToken } = useAuth();
  const [items, setItems] = useState<IEdmRegistrationJournalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [journalType, setJournalType] = useState<'all' | EdmRegistrationJournalType>('all');
  const [status, setStatus] = useState<'all' | EdmRegistrationStatus>('all');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchJournal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await edmApi.listRegistrationJournal({
        page,
        limit,
        journalType: journalType === 'all' ? undefined : journalType,
        status: status === 'all' ? undefined : status,
        registrationNumber: registrationNumber.trim() || undefined,
        fromDate: fromDate ? new Date(`${fromDate}T00:00:00.000Z`).toISOString() : undefined,
        toDate: toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : undefined,
      });
      setItems(response.items ?? []);
      setTotal(response.total ?? 0);
    } catch (err) {
      console.error('Failed to load registration journal', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [fromDate, journalType, limit, page, registrationNumber, status, t.loadError, toDate]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void fetchJournal();
  }, [accessToken, fetchJournal]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t.search}
              value={registrationNumber}
              onChange={(event) => {
                setRegistrationNumber(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={journalType}
            onValueChange={(value: 'all' | EdmRegistrationJournalType) => {
              setJournalType(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.type} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allTypes}</SelectItem>
              <SelectItem value="incoming">{t.incoming}</SelectItem>
              <SelectItem value="outgoing">{t.outgoing}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value: 'all' | EdmRegistrationStatus) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              <SelectItem value="registered">{t.registered}</SelectItem>
              <SelectItem value="cancelled">{t.cancelled}</SelectItem>
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setJournalType('incoming');
              setStatus('all');
              setPage(1);
            }}
          >
            {t.incoming}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setJournalType('outgoing');
              setStatus('all');
              setPage(1);
            }}
          >
            {t.outgoing}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setJournalType('all');
              setStatus('all');
              setRegistrationNumber('');
              setFromDate('');
              setToDate('');
              setPage(1);
            }}
          >
            {t.reset}
          </Button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t.number}</th>
                <th className="px-3 py-2">{t.type}</th>
                <th className="px-3 py-2">{t.status}</th>
                <th className="px-3 py-2">{t.document}</th>
                <th className="px-3 py-2">{t.department}</th>
                <th className="px-3 py-2">{t.registeredAt}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2">{item.registrationNumber}</td>
                    <td className="px-3 py-2">{journalTypeLabel[item.journalType]}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{registrationStatusLabel[item.status]}</Badge>
                    </td>
                    <td className="px-3 py-2">{item.document?.title ?? '—'}</td>
                    <td className="px-3 py-2">{item.document?.department?.name ?? '—'}</td>
                    <td className="px-3 py-2">
                      {format(new Date(item.registeredAt), 'dd.MM.yyyy HH:mm')}
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
  );
}


