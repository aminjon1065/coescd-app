'use client';

import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeftIcon } from 'lucide-react';
import { useEdmDocumentDetail } from './hooks/use-edm-document-detail';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { useAuth } from '@/context/auth-context';
import { can } from '@/features/authz/can';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EdmDocumentStatus, EdmDocumentType } from '@/interfaces/IEdmDocument';
import { RouteActionsCard } from './components/route-actions-card';
import { AttachmentsCard } from './components/attachments-card';
import { HistoryCard } from './components/history-card';
import { AuditCard } from './components/audit-card';
import { RepliesCard } from './components/replies-card';

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
  const { user } = useAuth();
  const {
    document,
    auditEvents,
    historyEvents,
    replies,
    attachments,
    availableFiles,
    loading,
    error,
    archiving,
    submittingToRoute,
    attachmentsLoading,
    selectedFileId,
    linkingFile,
    unlinkingFileId,
    stageActionLoadingId,
    stageCommentById,
    replyText,
    replySending,
    documentKinds,
    savingDocumentKind,
    setSelectedFileId,
    setReplyText,
    updateStageComment,
    archiveDocument,
    submitToRoute,
    sendReply,
    executeStageAction,
    updateDocumentKind,
    linkSelectedFile,
    unlinkFile,
    formatFileSize,
  } = useEdmDocumentDetail(id);

  const canUpdateDocument = can(user, {
    anyPermissions: ['documents.update'],
  });

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
              <p className="text-xs uppercase text-muted-foreground">Document Kind</p>
              {canUpdateDocument ? (
                <div className="mt-1 flex items-center gap-2">
                  <Select
                    value={document.documentKind?.id ? String(document.documentKind.id) : 'none'}
                    onValueChange={(value) =>
                      void updateDocumentKind(value === 'none' ? null : Number(value))
                    }
                    disabled={savingDocumentKind}
                  >
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="No kind" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No kind</SelectItem>
                      {documentKinds.map((kind) => (
                        <SelectItem key={kind.id} value={String(kind.id)}>
                          {kind.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {savingDocumentKind ? (
                    <span className="text-xs text-muted-foreground">Saving...</span>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm font-medium">{document.documentKind?.name ?? '—'}</p>
              )}
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
        </CardContent>
      </Card>

      <RouteActionsCard
        document={document}
        stageCommentById={stageCommentById}
        stageActionLoadingId={stageActionLoadingId}
        onStageCommentChange={updateStageComment}
        onExecuteStageAction={executeStageAction}
        onSubmitToRoute={submitToRoute}
        onArchiveDocument={archiveDocument}
        submittingToRoute={submittingToRoute}
        archiving={archiving}
      />
      <AttachmentsCard
        attachments={attachments}
        availableFiles={availableFiles}
        attachmentsLoading={attachmentsLoading}
        selectedFileId={selectedFileId}
        linkingFile={linkingFile}
        unlinkingFileId={unlinkingFileId}
        onSelectedFileChange={setSelectedFileId}
        onLinkSelectedFile={linkSelectedFile}
        onUnlinkFile={unlinkFile}
        formatFileSize={formatFileSize}
      />
      <HistoryCard events={historyEvents} />
      <AuditCard events={auditEvents} />
      <RepliesCard
        replies={replies}
        replyText={replyText}
        replySending={replySending}
        onReplyTextChange={setReplyText}
        onSendReply={sendReply}
      />
    </div>
  );
}
