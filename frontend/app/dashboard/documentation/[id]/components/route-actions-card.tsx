'use client';

import { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  RotateCcw,
  SendHorizonal,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { RoutePipeline } from '@/components/ui/route-pipeline';
import { IEdmDocument, IEdmRouteStage } from '@/interfaces/IEdmDocument';
import { cn } from '@/lib/utils';

type StageAction = 'approved' | 'rejected' | 'returned_for_revision' | 'commented';

interface Props {
  document: IEdmDocument;
  stageCommentById: Record<number, string>;
  stageActionLoadingId: number | null;
  onStageCommentChange: (stageId: number, value: string) => void;
  onExecuteStageAction: (stageId: number, action: StageAction) => void;
  onSubmitToRoute: () => void;
  onArchiveDocument: () => void;
  submittingToRoute: boolean;
  archiving: boolean;
}

// ── Stage action panel ────────────────────────────────────────────────────────

const STAGE_TYPE_LABEL: Record<string, string> = {
  approval:  'Согласование',
  review:    'Рассмотрение',
  signing:   'Подписание',
  execution: 'Исполнение',
  comment:   'Комментарий',
};

const STAGE_STATE_LABEL: Record<string, string> = {
  approved:              'Утверждён',
  completed:             'Завершён',
  in_progress:           'В работе',
  rejected:              'Отклонён',
  returned_for_revision: 'На доработку',
  pending:               'Ожидание',
  skipped:               'Пропущен',
};

function StagePanel({
  stage,
  comment,
  loadingId,
  onCommentChange,
  onAction,
}: {
  stage: IEdmRouteStage;
  comment: string;
  loadingId: number | null;
  onCommentChange: (v: string) => void;
  onAction: (action: StageAction) => void;
}) {
  const [expanded, setExpanded] = useState(() =>
    ['in_progress', 'pending'].includes(stage.state),
  );

  const isActive = ['in_progress', 'pending'].includes(stage.state);
  const isClosed = !isActive;
  const isLoading = loadingId === stage.id;

  const assigneeName =
    stage.assigneeUser?.name ?? stage.assigneeDepartment?.name ?? stage.assigneeType ?? '—';

  return (
    <div
      className={cn(
        'rounded-lg border',
        isActive
          ? 'border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20'
          : 'border-border bg-muted/20',
      )}
    >
      {/* Stage header — always visible */}
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Order badge */}
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            isActive
              ? 'bg-blue-500 text-white'
              : stage.state === 'approved' || stage.state === 'completed'
                ? 'bg-green-500 text-white'
                : stage.state === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'bg-muted text-muted-foreground',
          )}
        >
          {stage.orderNo}
        </span>

        {/* Stage info */}
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-sm font-medium">
            {STAGE_TYPE_LABEL[stage.stageType] ?? stage.stageType}
          </span>
          <span className="text-xs text-muted-foreground">{assigneeName}</span>
        </div>

        {/* State badge */}
        <StatusBadge status={stage.state} label={STAGE_STATE_LABEL[stage.state] ?? stage.state} />

        {/* Chevron */}
        <span className="ml-1 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 py-3">
          {/* Closed stage: show last action if any */}
          {isClosed && stage.actions?.length ? (
            <div className="mb-3 space-y-1">
              {stage.actions.slice(-1).map((action) => (
                <div key={action.id} className="text-xs text-muted-foreground">
                  <span className="font-medium">{action.actorUser?.name ?? '—'}</span>
                  {' · '}
                  <StatusBadge status={action.action} />
                  {action.commentText ? (
                    <p className="mt-1 italic">{action.commentText}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Due date */}
          {stage.dueAt && (
            <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Срок: {new Date(stage.dueAt).toLocaleDateString('ru-RU')}
            </p>
          )}

          {/* Action area — only for active stages */}
          {isActive ? (
            <div className="space-y-3">
              <Textarea
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="Комментарий к действию (необязательно)..."
                className="resize-none text-sm"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isLoading}
                  onClick={() => onAction('approved')}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Утвердить
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 gap-1.5"
                  disabled={isLoading}
                  onClick={() => onAction('rejected')}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Отклонить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  disabled={isLoading}
                  onClick={() => onAction('returned_for_revision')}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  На доработку
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-muted-foreground"
                  disabled={isLoading || !comment.trim()}
                  onClick={() => onAction('commented')}
                >
                  Комментарий
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Этап завершён, действия недоступны.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function RouteActionsCard({
  document,
  stageCommentById,
  stageActionLoadingId,
  onStageCommentChange,
  onExecuteStageAction,
  onSubmitToRoute,
  onArchiveDocument,
  submittingToRoute,
  archiving,
}: Props) {
  const route = document.route;
  const stages = route ? [...route.stages].sort((a, b) => a.orderNo - b.orderNo) : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base">Маршрут согласования</CardTitle>
        {route && (
          <span className="text-xs text-muted-foreground">
            Версия #{route.versionNo} · {route.completionPolicy === 'sequential' ? 'Последовательный' : 'Параллельный'}
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Pipeline visualization ───────────────────────────── */}
        {route ? (
          <div className="rounded-lg border bg-muted/20 px-4 py-3">
            <RoutePipeline route={route} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Маршрут не инициирован
          </div>
        )}

        {/* ── Stage action panels ──────────────────────────────── */}
        {stages.length > 0 && (
          <div className="space-y-2">
            {/* Active stages first, then closed (collapsed by default in StagePanel) */}
            {stages.map((stage) => (
              <StagePanel
                key={stage.id}
                stage={stage}
                comment={stageCommentById[stage.id] ?? ''}
                loadingId={stageActionLoadingId}
                onCommentChange={(v) => onStageCommentChange(stage.id, v)}
                onAction={(action) => onExecuteStageAction(stage.id, action)}
              />
            ))}
          </div>
        )}

        {/* ── Document-level actions ───────────────────────────── */}
        {(document.status === 'draft' || document.status === 'approved') && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {document.status === 'draft' && (
              <Button
                onClick={onSubmitToRoute}
                disabled={submittingToRoute}
                className="gap-2"
              >
                {submittingToRoute ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4" />
                )}
                {submittingToRoute ? 'Отправка...' : 'Отправить в маршрут'}
              </Button>
            )}
            {document.status === 'approved' && (
              <Button
                variant="outline"
                onClick={onArchiveDocument}
                disabled={archiving}
                className="gap-2"
              >
                {archiving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {archiving ? 'Архивирование...' : 'Отправить в архив'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
