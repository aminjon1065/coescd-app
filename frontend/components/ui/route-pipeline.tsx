'use client';

import { cn } from '@/lib/utils';
import { Check, X, RotateCcw, Clock, Loader2 } from 'lucide-react';
import { IEdmRoute, IEdmRouteStage } from '@/interfaces/IEdmDocument';

// ── Stage state helpers ───────────────────────────────────────────────────────

type StageState =
  | 'approved'
  | 'completed'
  | 'in_progress'
  | 'rejected'
  | 'returned_for_revision'
  | 'pending'
  | 'skipped';

interface StageVisual {
  bg: string;
  border: string;
  text: string;
  label: string;
}

const STAGE_VISUAL: Record<StageState, StageVisual> = {
  approved:              { bg: 'bg-green-500',  border: 'border-green-500',  text: 'text-white',          label: 'Утверждён' },
  completed:             { bg: 'bg-green-500',  border: 'border-green-500',  text: 'text-white',          label: 'Завершён' },
  in_progress:           { bg: 'bg-blue-500',   border: 'border-blue-500',   text: 'text-white',          label: 'В работе' },
  rejected:              { bg: 'bg-red-500',    border: 'border-red-500',    text: 'text-white',          label: 'Отклонён' },
  returned_for_revision: { bg: 'bg-amber-500',  border: 'border-amber-500',  text: 'text-white',          label: 'На доработку' },
  pending:               { bg: 'bg-background', border: 'border-gray-300',   text: 'text-muted-foreground', label: 'Ожидание' },
  skipped:               { bg: 'bg-gray-100',   border: 'border-gray-300',   text: 'text-gray-400',       label: 'Пропущен' },
};

function StageIcon({ state }: { state: StageState }) {
  if (state === 'approved' || state === 'completed') return <Check className="h-3 w-3" />;
  if (state === 'rejected') return <X className="h-3 w-3" />;
  if (state === 'returned_for_revision') return <RotateCcw className="h-3 w-3" />;
  if (state === 'in_progress') return <Loader2 className="h-3 w-3 animate-spin" />;
  if (state === 'skipped') return <X className="h-3 w-3 opacity-40" />;
  return <Clock className="h-3 w-3 opacity-40" />;
}

function assigneeName(stage: IEdmRouteStage): string {
  if (stage.assigneeUser?.name) return stage.assigneeUser.name.split(' ')[0];
  if (stage.assigneeDepartment?.name) return stage.assigneeDepartment.name;
  return stage.assigneeType ?? '—';
}

const STAGE_TYPE_LABEL: Record<string, string> = {
  approval:  'Согласование',
  review:    'Рассмотрение',
  signing:   'Подписание',
  execution: 'Исполнение',
  comment:   'Комментарий',
};

// ── Component ────────────────────────────────────────────────────────────────

interface RoutePipelineProps {
  route: IEdmRoute;
  /** Compact mode hides assignee names and shrinks nodes */
  compact?: boolean;
  className?: string;
}

export function RoutePipeline({ route, compact = false, className }: RoutePipelineProps) {
  const stages = [...route.stages].sort((a, b) => a.orderNo - b.orderNo);

  return (
    <div className={cn('flex items-start gap-0 overflow-x-auto pb-1', className)}>
      {stages.map((stage, idx) => {
        const state = (stage.state ?? 'pending') as StageState;
        const visual = STAGE_VISUAL[state] ?? STAGE_VISUAL.pending;
        const isLast = idx === stages.length - 1;

        return (
          <div key={stage.id} className="flex items-start">
            {/* Stage node */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={cn(
                  'flex items-center justify-center rounded-full border-2 font-bold shrink-0',
                  compact ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-xs',
                  visual.bg,
                  visual.border,
                  visual.text,
                  state === 'in_progress' && 'ring-2 ring-blue-300 ring-offset-1',
                )}
                title={visual.label}
              >
                <StageIcon state={state} />
              </div>

              {/* Label below */}
              {!compact && (
                <div className="mt-1 flex flex-col items-center text-center">
                  <span className="text-[11px] font-medium leading-tight text-foreground/80 max-w-[72px] truncate">
                    {STAGE_TYPE_LABEL[stage.stageType] ?? stage.stageType}
                  </span>
                  <span className="text-[10px] text-muted-foreground max-w-[72px] truncate">
                    {assigneeName(stage)}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 rounded px-1 text-[10px] font-medium',
                      state === 'in_progress' && 'bg-blue-50 text-blue-600',
                      state === 'approved'  && 'bg-green-50 text-green-600',
                      state === 'rejected'  && 'bg-red-50 text-red-600',
                      state === 'pending'   && 'text-muted-foreground',
                      state === 'returned_for_revision' && 'bg-amber-50 text-amber-600',
                    )}
                  >
                    {visual.label}
                  </span>
                </div>
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'mt-3.5 h-0.5 shrink-0',
                  compact ? 'w-6' : 'w-8',
                  state === 'approved' || state === 'completed'
                    ? 'bg-green-400'
                    : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
