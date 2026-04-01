'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Tag,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { listDocuments, createDocument, getMyQueue } from '@/lib/api/documents-v2';
import { StatusBadgeV2 } from '@/components/edm/StatusBadgeV2';
import type { DocV2Status, DocSearchParams } from '@/interfaces/IDocumentV2';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const STATUS_OPTIONS: Array<{ value: DocV2Status | ''; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'draft', label: 'Черновик' },
  { value: 'review', label: 'На проверке' },
  { value: 'approval', label: 'Согласование' },
  { value: 'signed', label: 'Подписан' },
  { value: 'rejected', label: 'Отклонён' },
  { value: 'archived', label: 'Архив' },
];

const DOC_TYPES = [
  'incoming', 'outgoing', 'internal', 'order', 'resolution',
];
const DOC_TYPE_LABELS: Record<string, string> = {
  incoming: 'Входящий', outgoing: 'Исходящий', internal: 'Внутренний',
  order: 'Приказ', resolution: 'Постановление',
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [params, setParams] = useState<DocSearchParams>({ page: 1, limit: 20, sortDir: 'DESC' });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('internal');

  const listQuery = useQuery({
    queryKey: ['documents-v2-list', params],
    queryFn: () => listDocuments(params),
    enabled: activeTab === 'all',
  });

  const queueQuery = useQuery({
    queryKey: ['documents-v2-queue'],
    queryFn: () => getMyQueue(),
    enabled: activeTab === 'mine',
  });

  const createMutation = useMutation({
    mutationFn: () => createDocument({ title: newTitle, docType: newType }),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['documents-v2-list'] });
      setCreateOpen(false);
      setNewTitle('');
      setNewType('internal');
      window.location.href = `/dashboard/documents/${doc.id}`;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((p) => ({ ...p, q: search, page: 1 }));
  };

  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / (params.limit ?? 20));
  const items = activeTab === 'all' ? (listQuery.data?.items ?? []) : (queueQuery.data ?? []);
  const isLoading = activeTab === 'all' ? listQuery.isLoading : queueQuery.isLoading;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Документы</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Управление документооборотом организации
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[oklch(0.546_0.245_262.881)] hover:bg-[oklch(0.48_0.24_262.881)] text-white dark:bg-[oklch(0.546_0.245_262.881)]">
              <Plus className="w-4 h-4 mr-1" />
              Новый документ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Создать документ</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Заголовок</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Введите заголовок документа..."
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Тип документа</Label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{DOC_TYPE_LABELS[t] ?? t}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="bg-[oklch(0.546_0.245_262.881)] hover:bg-[oklch(0.48_0.24_262.881)] text-white"
              >
                {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {([['all', 'Все документы', <FileText className="w-3.5 h-3.5" key="f" />], ['mine', 'Мои задачи', <Inbox className="w-3.5 h-3.5" key="i" />]] as const).map(([tab, label, icon]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Filters (all tab) ── */}
      {activeTab === 'all' && (
        <div className="flex flex-wrap gap-3 items-end">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px] max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                placeholder="Поиск по названию..."
              />
            </div>
            <Button type="submit" variant="outline" size="icon">
              <Search className="w-4 h-4" />
            </Button>
          </form>

          <select
            value={params.status ?? ''}
            onChange={(e) =>
              setParams((p) => ({ ...p, status: (e.target.value as DocV2Status) || undefined, page: 1 }))
            }
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={params.sortBy ?? 'updated_at'}
            onChange={(e) =>
              setParams((p) => ({ ...p, sortBy: e.target.value as DocSearchParams['sortBy'], page: 1 }))
            }
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="updated_at">По обновлению</option>
            <option value="created_at">По созданию</option>
            <option value="title">По названию</option>
          </select>
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <FileText className="w-10 h-10 opacity-30" />
            <p className="text-sm">Нет документов</p>
            {activeTab === 'all' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Создать первый документ
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                <th className="text-left px-4 py-3 font-medium">Документ</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Тип</th>
                <th className="text-left px-4 py-3 font-medium">Статус</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Автор</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Обновлён</th>
              </tr>
            </thead>
            <tbody>
              {items.map((doc, i) => (
                <tr
                  key={doc.id}
                  className={cn(
                    'border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer',
                    i % 2 === 0 ? '' : 'bg-muted/10',
                  )}
                >
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/documents/${doc.id}`} className="block">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-md bg-[oklch(0.546_0.245_262.881)]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-3.5 h-3.5 text-[oklch(0.546_0.245_262.881)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-xs">{doc.title}</p>
                          {doc.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Tag className="w-2.5 h-2.5 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground truncate">
                                {doc.tags.slice(0, 3).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadgeV2 status={doc.status} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{doc.owner?.name}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true, locale: ru })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {activeTab === 'all' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Показано {((params.page ?? 1) - 1) * (params.limit ?? 20) + 1}–
            {Math.min((params.page ?? 1) * (params.limit ?? 20), total)} из {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={(params.page ?? 1) <= 1}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {params.page ?? 1} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={(params.page ?? 1) >= totalPages}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
