'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  AlertCircle,
  Loader2,
  UserCheck,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getWorkflow, performTransition, startWorkflow } from '@/lib/api/documents-v2';
import type {
  IWorkflowInstance,
  WorkflowStepDef,
} from '@/interfaces/IDocumentV2';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Props {
  documentId: string;
  currentUserId: number;
  docStatus: string;
}

function stepIcon(type: string) {
  switch (type) {
    case 'editing': return '✏️';
    case 'review': return '🔍';
    case 'approval': return '✅';
    case 'signing': return '✍️';
    case 'terminal': return '🏁';
    default: return '•';
  }
}

function formatDeadline(iso: string | null): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Просрочено';
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}д ${h % 24}ч`;
  return `${h}ч`;
}

export function WorkflowPanel({ documentId, currentUserId, docStatus }: Props) {
  const qc = useQueryClient();
  const [actionState, setActionState] = useState<{
    action: string;
    label: string;
    requiresComment: boolean;
  } | null>(null);
  const [comment, setComment] = useState('');

  const { data: instance, isLoading } = useQuery({
    queryKey: ['doc-workflow', documentId],
    queryFn: () => getWorkflow(documentId),
    refetchInterval: 15_000,
  });

  const startMutation = useMutation({
    mutationFn: () => startWorkflow(documentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-workflow', documentId] }),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ action, comment }: { action: string; comment?: string }) =>
      performTransition(documentId, action, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-workflow', documentId] });
      qc.invalidateQueries({ queryKey: ['document-v2', documentId] });
      qc.invalidateQueries({ queryKey: ['doc-activity', documentId] });
      setActionState(null);
      setComment('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!instance && docStatus === 'draft') {
    return (
      <div className="flex flex-col gap-4 p-1">
        <p className="text-sm text-muted-foreground">Рабочий процесс не запущен.</p>
        <Button
          size="sm"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          className="bg-[oklch(0.546_0.245_262.881)] hover:bg-[oklch(0.48_0.24_262.881)] text-white"
        >
          {startMutation.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          Отправить на согласование
        </Button>
      </div>
    );
  }

  if (!instance) {
    return <p className="text-sm text-muted-foreground p-1">Нет активного процесса.</p>;
  }

  const steps: WorkflowStepDef[] = instance.definitionSnapshot?.steps ?? [];
  const currentStep = steps.find((s) => s.id === instance.currentStepId);
  const isAssignee = instance.assignments?.some(
    (a) => a.assigneeId === currentUserId && !a.actedAt,
  );

  return (
    <>
      {/* Step progress */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          {steps.map((step, i) => {
            const stepIndex = steps.findIndex((s) => s.id === instance.currentStepId);
            const isDone = i < stepIndex || (instance.status === 'completed' && i <= stepIndex);
            const isCurrent = step.id === instance.currentStepId && instance.status === 'active';

            return (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0',
                    isDone && 'bg-[oklch(0.546_0.245_262.881)] text-white',
                    isCurrent && 'bg-[oklch(0.546_0.245_262.881)]/20 border-2 border-[oklch(0.546_0.245_262.881)] text-[oklch(0.546_0.245_262.881)]',
                    !isDone && !isCurrent && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs',
                    isCurrent && 'font-semibold text-foreground',
                    !isCurrent && 'text-muted-foreground',
                  )}
                >
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current step details */}
        {currentStep && instance.status === 'active' && (
          <div className="rounded-lg border bg-card p-3 flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {stepIcon(currentStep.type)} {currentStep.name}
              </span>
              {instance.deadline && (
                <span
                  className={cn(
                    'text-xs flex items-center gap-1',
                    new Date(instance.deadline) < new Date()
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  <CalendarClock className="w-3 h-3" />
                  {formatDeadline(instance.deadline)}
                </span>
              )}
            </div>

            {/* Assignees */}
            {instance.assignments
              .filter((a) => a.stepId === instance.currentStepId)
              .map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <UserCheck className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {a.assignee.name}
                    {a.actedAt && (
                      <span className="ml-1 text-green-600 dark:text-green-400">
                        ({a.action})
                      </span>
                    )}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Action buttons */}
        {isAssignee && currentStep && currentStep.type !== 'terminal' && (
          <div className="flex flex-col gap-2 mt-1">
            {currentStep.transitions.map((t) => {
              const isApprove = ['approve', 'sign'].includes(t.action);
              const isReject = ['reject', 'return'].includes(t.action);
              const requiresComment = currentStep.requireComment?.includes(t.action) ?? false;

              return (
                <Button
                  key={t.action}
                  size="sm"
                  variant={isReject ? 'destructive' : 'default'}
                  className={cn(
                    isApprove &&
                      'bg-[oklch(0.546_0.245_262.881)] hover:bg-[oklch(0.48_0.24_262.881)] text-white dark:bg-[oklch(0.546_0.245_262.881)]',
                  )}
                  disabled={transitionMutation.isPending}
                  onClick={() => {
                    const labels: Record<string, string> = {
                      approve: 'Согласовать',
                      reject: 'Отклонить',
                      sign: 'Подписать',
                      submit: 'Отправить',
                      return: 'Вернуть',
                    };
                    setActionState({
                      action: t.action,
                      label: labels[t.action] ?? t.action,
                      requiresComment,
                    });
                  }}
                >
                  {isApprove && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {isReject && <XCircle className="w-3 h-3 mr-1" />}
                  {actionState?.action === t.action && transitionMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    (({ approve: 'Согласовать', reject: 'Отклонить', sign: 'Подписать', submit: 'Отправить', return: 'Вернуть' }) as Record<string, string>)[t.action] ?? t.action
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {instance.status === 'completed' && (
          <div className="flex items-center gap-2 rounded-md bg-[--status-approved-bg] text-[--status-approved-fg] px-3 py-2 text-xs font-medium mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Процесс завершён
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!actionState} onOpenChange={(o) => { if (!o) { setActionState(null); setComment(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionState?.label}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Подтвердите действие
              {actionState?.requiresComment ? ' (комментарий обязателен)' : ''}.
            </p>
            {(actionState?.requiresComment || true) && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wf-comment" className="text-xs">
                  Комментарий{actionState?.requiresComment ? ' *' : ' (необязательно)'}
                </Label>
                <textarea
                  id="wf-comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Введите комментарий..."
                />
              </div>
            )}
            {transitionMutation.isError && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {(transitionMutation.error as Error)?.message ?? 'Ошибка'}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setActionState(null); setComment(''); }}>
              Отмена
            </Button>
            <Button
              size="sm"
              disabled={
                transitionMutation.isPending ||
                (actionState?.requiresComment && !comment.trim())
              }
              onClick={() => {
                if (!actionState) return;
                transitionMutation.mutate({ action: actionState.action, comment: comment || undefined });
              }}
              className="bg-[oklch(0.546_0.245_262.881)] hover:bg-[oklch(0.48_0.24_262.881)] text-white"
            >
              {transitionMutation.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              {actionState?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
