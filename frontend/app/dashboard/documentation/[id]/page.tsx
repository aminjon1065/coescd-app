'use client';

import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  FileText,
  Hash,
  Lock,
  User,
} from 'lucide-react';
import { useEdmDocumentDetail } from './hooks/use-edm-document-detail';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { useAuth } from '@/context/auth-context';
import { can } from '@/features/authz/can';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { EdmDocumentType } from '@/interfaces/IEdmDocument';
import { RouteActionsCard } from './components/route-actions-card';
import { AttachmentsCard } from './components/attachments-card';
import { HistoryCard } from './components/history-card';
import { AuditCard } from './components/audit-card';
import { RepliesCard } from './components/replies-card';
import { cn } from '@/lib/utils';

// ── Label maps ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<EdmDocumentType, string> = {
  incoming:   'Входящий',
  outgoing:   'Исходящий',
  internal:   'Внутренний',
  order:      'Приказ',
  resolution: 'Резолюция',
};

const CONFIDENTIALITY_LABEL: Record<string, string> = {
  public_internal:         'Внутренний',
  department_confidential: 'Конфиденциально (подразделение)',
  restricted:              'Ограниченный доступ',
};

// ── Metadata field ────────────────────────────────────────────────────────────

function MetaField({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <div className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DocumentDetailPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents.detail"
      deniedDescription="Просмотр документов требует соответствующих прав доступа."
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

  const canUpdateDocument = can(user, { anyPermissions: ['documents.update'] });

  if (loading) return <DetailSkeleton />;

  if (error || !document) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? 'Документ не найден'}
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isOverdue =
    document.dueAt &&
    !['approved', 'archived', 'rejected'].includes(document.status) &&
    new Date() > new Date(document.dueAt);

  return (
    <div className="space-y-4">
      {/* ── Back button ──────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground"
        onClick={() => router.push('/dashboard/documentation')}
      >
        <ArrowLeft className="h-4 w-4" />
        Журнал документов
      </Button>

      {/* ── Document header card ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl leading-tight">{document.title}</CardTitle>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                {document.externalNumber ?? `EDM-${document.id}`}
              </p>
            </div>

            {/* Status + type badges */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                {TYPE_LABEL[document.type]}
              </span>
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                <Lock className="mr-1 h-3 w-3" />
                {CONFIDENTIALITY_LABEL[document.confidentiality] ?? document.confidentiality}
              </span>
              <StatusBadge status={document.status} />
              {isOverdue && (
                <StatusBadge status="overdue" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ── Metadata grid ─────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetaField
              icon={User}
              label="Инициатор"
              value={
                <div>
                  <p className="font-medium">{document.creator?.name ?? '—'}</p>
                  {document.creator?.email && (
                    <p className="text-xs text-muted-foreground">{document.creator.email}</p>
                  )}
                </div>
              }
            />
            <MetaField
              icon={Building2}
              label="Подразделение"
              value={document.department?.name}
            />
            <MetaField
              icon={Calendar}
              label="Создан"
              value={format(new Date(document.createdAt), 'dd.MM.yyyy HH:mm')}
            />
            <MetaField
              icon={CalendarClock}
              label="Срок"
              value={
                document.dueAt ? (
                  <span className={cn(isOverdue && 'font-medium text-red-600 dark:text-red-400')}>
                    {format(new Date(document.dueAt), 'dd.MM.yyyy')}
                    {isOverdue ? ' (просрочено)' : ''}
                  </span>
                ) : null
              }
            />
          </div>

          {/* ── Document kind ─────────────────────────────────── */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <FileText className="h-3 w-3" />
                Вид документа
              </p>
              {canUpdateDocument ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={
                      document.documentKind?.id ? String(document.documentKind.id) : 'none'
                    }
                    onValueChange={(v) =>
                      void updateDocumentKind(v === 'none' ? null : Number(v))
                    }
                    disabled={savingDocumentKind}
                  >
                    <SelectTrigger className="h-8 w-[220px] text-sm">
                      <SelectValue placeholder="Не указан" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не указан</SelectItem>
                      {documentKinds.map((kind) => (
                        <SelectItem key={kind.id} value={String(kind.id)}>
                          {kind.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {savingDocumentKind && (
                    <span className="text-xs text-muted-foreground">Сохранение...</span>
                  )}
                </div>
              ) : (
                <p className="text-sm">{document.documentKind?.name ?? '—'}</p>
              )}
            </div>
          </div>

          {/* ── Text fields ───────────────────────────────────── */}
          {document.subject && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Тема
              </p>
              <p className="text-sm">{document.subject}</p>
            </div>
          )}

          {document.summary && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Краткое содержание
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {document.summary}
              </p>
            </div>
          )}

          {document.resolutionText && (
            <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Резолюция
              </p>
              <p className="whitespace-pre-wrap text-sm">{document.resolutionText}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Route & actions ──────────────────────────────────────── */}
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

      {/* ── Attachments ──────────────────────────────────────────── */}
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

      {/* ── Timeline: history + audit ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <HistoryCard events={historyEvents} />
        <AuditCard events={auditEvents} />
      </div>

      {/* ── Replies ──────────────────────────────────────────────── */}
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
