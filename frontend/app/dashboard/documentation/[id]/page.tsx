'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeftIcon, Link2Icon, SendIcon, UnlinkIcon } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IEdmAuditEvent,
  IEdmDocument,
  IEdmFileAttachment,
  IEdmHistoryEvent,
  IEdmReply,
  EdmDocumentStatus,
  EdmDocumentType,
} from '@/interfaces/IEdmDocument';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

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
  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents.detail"
      deniedDescription="Карточка документа доступна пользователям с правом чтения документов."
    >
      <DocumentDetailContent />
    </ProtectedRouteGate>
  );
}

function DocumentDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [document, setDocument] = useState<IEdmDocument | null>(null);
  const [auditEvents, setAuditEvents] = useState<IEdmAuditEvent[]>([]);
  const [historyEvents, setHistoryEvents] = useState<IEdmHistoryEvent[]>([]);
  const [replies, setReplies] = useState<IEdmReply[]>([]);
  const [attachments, setAttachments] = useState<IEdmFileAttachment[]>([]);
  const [availableFiles, setAvailableFiles] = useState<IEdmFileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [submittingToRoute, setSubmittingToRoute] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [linkingFile, setLinkingFile] = useState(false);
  const [unlinkingFileId, setUnlinkingFileId] = useState<number | null>(null);
  const [stageActionLoadingId, setStageActionLoadingId] = useState<number | null>(null);
  const [stageCommentById, setStageCommentById] = useState<Record<number, string>>({});
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);

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

  const fetchTimelineBlocks = useCallback(async () => {
    if (!documentId) {
      return;
    }
    try {
      const [auditRes, historyRes, repliesRes] = await Promise.all([
        api.get<IEdmAuditEvent[]>(`/edm/documents/${documentId}/audit`),
        api.get<IEdmHistoryEvent[]>(`/edm/documents/${documentId}/history`),
        api.get<IEdmReply[]>(`/edm/documents/${documentId}/replies`),
      ]);
      setAuditEvents(Array.isArray(auditRes.data) ? auditRes.data : []);
      setHistoryEvents(Array.isArray(historyRes.data) ? historyRes.data : []);
      setReplies(Array.isArray(repliesRes.data) ? repliesRes.data : []);
    } catch (err) {
      console.error('Failed to load EDM timeline blocks', err);
    }
  }, [documentId]);

  const fetchAttachments = useCallback(async () => {
    if (!documentId) {
      return;
    }
    setAttachmentsLoading(true);
    try {
      const [linkedRes, filesRes] = await Promise.all([
        api.get<IEdmFileAttachment[]>(`/edm/documents/${documentId}/files`),
        api.get<IEdmFileAttachment[]>('/files'),
      ]);
      const linked = Array.isArray(linkedRes.data) ? linkedRes.data : [];
      const allFiles = Array.isArray(filesRes.data) ? filesRes.data : [];
      const linkedIds = new Set(linked.map((item) => item.id));
      const candidates = allFiles.filter((item) => item.status === 'active' && !linkedIds.has(item.id));

      setAttachments(linked);
      setAvailableFiles(candidates);
      if (!selectedFileId && candidates.length > 0) {
        setSelectedFileId(String(candidates[0].id));
      } else if (selectedFileId && !candidates.some((item) => String(item.id) === selectedFileId)) {
        setSelectedFileId(candidates.length > 0 ? String(candidates[0].id) : '');
      }
    } catch (err) {
      console.error('Failed to load EDM attachments', err);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [documentId, selectedFileId]);

  useEffect(() => {
    if (!accessToken || !documentId) {
      return;
    }
    void fetchDocument();
    void fetchTimelineBlocks();
    void fetchAttachments();
  }, [accessToken, documentId, fetchAttachments, fetchDocument, fetchTimelineBlocks]);

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

  const submitToRoute = async () => {
    if (!document) {
      return;
    }
    setSubmittingToRoute(true);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/submit`, {});
      await fetchDocument();
      await fetchTimelineBlocks();
    } catch (err) {
      console.error('Failed to submit EDM document to route', err);
      setError('Не удалось отправить документ в маршрут.');
    } finally {
      setSubmittingToRoute(false);
    }
  };

  const sendReply = async () => {
    if (!document || !replyText.trim()) {
      return;
    }
    setReplySending(true);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/replies`, {
        messageText: replyText.trim(),
      });
      setReplyText('');
      await fetchTimelineBlocks();
    } catch (err) {
      console.error('Failed to create EDM reply', err);
      setError('Не удалось отправить сообщение в тред документа.');
    } finally {
      setReplySending(false);
    }
  };

  const executeStageAction = async (
    stageId: number,
    action: 'approved' | 'rejected' | 'returned_for_revision' | 'commented',
  ) => {
    if (!document) {
      return;
    }
    setStageActionLoadingId(stageId);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/stages/${stageId}/actions`, {
        action,
        commentText: stageCommentById[stageId]?.trim() || undefined,
      });
      await fetchDocument();
      await fetchTimelineBlocks();
    } catch (err) {
      console.error('Failed to execute EDM stage action', err);
      setError('Не удалось выполнить действие по этапу. Проверьте права и состояние этапа.');
    } finally {
      setStageActionLoadingId(null);
    }
  };

  const linkSelectedFile = async () => {
    if (!document || !selectedFileId) {
      return;
    }
    setLinkingFile(true);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/files/${selectedFileId}`);
      await fetchAttachments();
    } catch (err) {
      console.error('Failed to link EDM attachment', err);
      setError('Не удалось прикрепить файл к документу.');
    } finally {
      setLinkingFile(false);
    }
  };

  const unlinkFile = async (fileId: number) => {
    if (!document) {
      return;
    }
    setUnlinkingFileId(fileId);
    setError(null);
    try {
      await api.delete(`/edm/documents/${document.id}/files/${fileId}`);
      await fetchAttachments();
    } catch (err) {
      console.error('Failed to unlink EDM attachment', err);
      setError('Не удалось отвязать файл от документа.');
    } finally {
      setUnlinkingFileId(null);
    }
  };

  const formatFileSize = (sizeBytes: string) => {
    const size = Number(sizeBytes);
    if (!Number.isFinite(size) || size <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const result = size / 1024 ** exponent;
    return `${result.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
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
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={stageCommentById[stage.id] ?? ''}
                          onChange={(event) =>
                            setStageCommentById((prev) => ({
                              ...prev,
                              [stage.id]: event.target.value,
                            }))
                          }
                          placeholder="Комментарий к действию этапа (опционально)"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => executeStageAction(stage.id, 'approved')}
                            disabled={
                              !['pending', 'in_progress'].includes(stage.state) ||
                              stageActionLoadingId === stage.id
                            }
                          >
                            Утвердить
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => executeStageAction(stage.id, 'rejected')}
                            disabled={
                              !['pending', 'in_progress'].includes(stage.state) ||
                              stageActionLoadingId === stage.id
                            }
                          >
                            Отклонить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => executeStageAction(stage.id, 'returned_for_revision')}
                            disabled={
                              !['pending', 'in_progress'].includes(stage.state) ||
                              stageActionLoadingId === stage.id
                            }
                          >
                            На доработку
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => executeStageAction(stage.id, 'commented')}
                            disabled={
                              !['pending', 'in_progress'].includes(stage.state) ||
                              stageActionLoadingId === stage.id
                            }
                          >
                            Комментарий
                          </Button>
                        </div>
                        {!['pending', 'in_progress'].includes(stage.state) ? (
                          <p className="text-xs text-muted-foreground">
                            Этап закрыт, действия недоступны.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {document.status === 'draft' ? (
              <Button onClick={submitToRoute} disabled={submittingToRoute}>
                {submittingToRoute ? 'Отправка...' : 'Отправить в маршрут'}
              </Button>
            ) : null}
            {document.status === 'approved' ? (
              <Button onClick={archiveDocument} disabled={archiving}>
                {archiving ? 'Архивирование...' : 'Отправить в архив'}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Вложения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={selectedFileId} onValueChange={setSelectedFileId}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="Выберите файл для привязки" />
              </SelectTrigger>
              <SelectContent>
                {availableFiles.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Нет доступных файлов
                  </SelectItem>
                ) : (
                  availableFiles.map((file) => (
                    <SelectItem key={file.id} value={String(file.id)}>
                      {file.originalName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button onClick={linkSelectedFile} disabled={!selectedFileId || linkingFile}>
              <Link2Icon className="mr-2 h-4 w-4" />
              {linkingFile ? 'Привязка...' : 'Привязать'}
            </Button>
          </div>

          {attachmentsLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка вложений...</p>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Вложений пока нет.</p>
          ) : (
            attachments.map((file) => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{file.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.mimeType} • {formatFileSize(file.sizeBytes)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer">
                      Скачать
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => unlinkFile(file.id)}
                    disabled={unlinkingFileId === file.id}
                  >
                    <UnlinkIcon className="mr-2 h-4 w-4" />
                    {unlinkingFileId === file.id ? 'Отвязка...' : 'Отвязать'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>История движения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">История пока пустая.</p>
          ) : (
            historyEvents.map((event) => (
              <div key={event.id} className="rounded border px-3 py-2">
                <p className="text-sm font-medium">{event.eventType}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.createdAt), 'dd.MM.yyyy HH:mm')}
                </p>
                <p className="text-xs text-muted-foreground">
                  От: {event.fromUser?.name ?? '—'} | Кому: {event.toUser?.name ?? '—'}
                </p>
                {event.commentText ? (
                  <p className="mt-1 text-sm whitespace-pre-wrap">{event.commentText}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit действий</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Audit-записи пока отсутствуют.</p>
          ) : (
            auditEvents.map((event) => (
              <div key={event.id} className="rounded border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{event.action}</Badge>
                  {event.stage ? (
                    <Badge variant="outline">
                      Этап #{event.stage.orderNo} ({event.stage.stageType})
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(event.createdAt), 'dd.MM.yyyy HH:mm')} | Актор:{' '}
                  {event.actorUser?.name ?? '—'}
                </p>
                {event.commentText ? (
                  <p className="mt-1 text-sm whitespace-pre-wrap">{event.commentText}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Переписка по документу</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder="Напишите сообщение в тред документа..."
            />
            <Button onClick={sendReply} disabled={replySending || !replyText.trim()}>
              <SendIcon className="mr-2 h-4 w-4" />
              {replySending ? 'Отправка...' : 'Отправить'}
            </Button>
          </div>
          {replies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Сообщений пока нет.</p>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} className="rounded border px-3 py-2">
                <p className="text-sm">{reply.messageText}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {reply.senderUser?.name ?? '—'} | {format(new Date(reply.createdAt), 'dd.MM.yyyy HH:mm')}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
