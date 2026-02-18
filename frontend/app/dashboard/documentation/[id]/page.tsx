'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeftIcon } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { IEdmDocument, EdmDocumentStatus, EdmDocumentType } from '@/interfaces/IEdmDocument';

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
  public_internal: 'Внутренний доступ',
  department_confidential: 'Конфиденциально (департамент)',
  restricted: 'Ограниченный доступ',
} as const;

const statusBadgeClass: Record<EdmDocumentStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-300',
  in_route: 'bg-blue-100 text-blue-700 border-blue-300',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  returned_for_revision: 'bg-amber-100 text-amber-700 border-amber-300',
  archived: 'bg-zinc-100 text-zinc-700 border-zinc-300',
};

export default function DocumentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [document, setDocument] = useState<IEdmDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const documentId = useMemo(() => Number(id), [id]);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<IEdmDocument>(`/edm/documents/${documentId}`);
      setDocument(response.data);
    } catch (err) {
      console.error('Failed to load EDM document', err);
      setError('Не удалось загрузить карточку документа.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (!accessToken || !documentId) {
      return;
    }
    void fetchDocument();
  }, [accessToken, documentId, fetchDocument]);

  const archiveDocument = async () => {
    if (!document) {
      return;
    }
    setArchiving(true);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/archive`);
      await fetchDocument();
    } catch (err) {
      console.error('Failed to archive EDM document', err);
      setError('Не удалось отправить документ в архив.');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !document) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-red-600">{error ?? 'Документ не найден'}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Назад
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/documentation')}>
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Назад к журналу
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{document.title}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Рег. номер: {document.externalNumber ?? `EDM-${document.id}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{typeLabel[document.type]}</Badge>
            <Badge variant="outline">{confidentialityLabel[document.confidentiality]}</Badge>
            <Badge variant="outline" className={statusBadgeClass[document.status]}>
              {statusLabel[document.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Инициатор</p>
              <p className="text-sm font-medium">{document.creator?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{document.creator?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Департамент</p>
              <p className="text-sm font-medium">{document.department?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Создан</p>
              <p className="text-sm">{format(new Date(document.createdAt), 'dd.MM.yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Срок</p>
              <p className="text-sm">
                {document.dueAt ? format(new Date(document.dueAt), 'dd.MM.yyyy') : 'Не задан'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase text-muted-foreground">Тема</p>
            <p className="text-sm">{document.subject || '—'}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-muted-foreground">Краткое содержание</p>
            <p className="text-sm whitespace-pre-wrap">
              {document.summary || 'Содержание отсутствует'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-muted-foreground">Резолюция</p>
            <p className="text-sm whitespace-pre-wrap">
              {document.resolutionText || 'Резолюция не задана'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-muted-foreground">Маршрут</p>
            {!document.route ? (
              <p className="text-sm text-muted-foreground">Маршрут не инициирован</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">
                  Версия #{document.route.versionNo}, состояние: {document.route.state}
                </p>
                <div className="space-y-2">
                  {document.route.stages.map((stage) => (
                    <div key={stage.id} className="rounded border px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          Этап {stage.orderNo}: {stage.stageType}
                        </p>
                        <Badge variant="outline">{stage.state}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Исполнитель: {stage.assigneeUser?.name ?? stage.assigneeDepartment?.name ?? stage.assigneeType}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {document.status === 'approved' ? (
            <Button onClick={archiveDocument} disabled={archiving}>
              {archiving ? 'Архивирование...' : 'Отправить в архив'}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
