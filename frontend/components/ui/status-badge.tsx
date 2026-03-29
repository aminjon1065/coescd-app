import { cn } from '@/lib/utils';

export type StatusVariant =
  // EDM document
  | 'draft'
  | 'in_route'
  | 'approved'
  | 'rejected'
  | 'archived'
  | 'overdue'
  | 'registered'
  | 'returned_for_revision'
  // Route stages
  | 'pending'
  | 'in_progress'
  | 'skipped'
  // Tasks
  | 'new'
  // Calls
  | 'active'
  | 'ended'
  | 'missed'
  | 'cancelled'
  // GIS / Disaster statuses
  | 'monitoring'
  | 'resolved'
  // GIS / Disaster severity
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  // General
  | 'completed';

interface StatusConfig {
  label: string;
  classes: string;
}

const STATUS_CONFIG: Record<StatusVariant, StatusConfig> = {
  // EDM document
  draft:                 { label: 'Черновик',           classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  in_route:              { label: 'В маршруте',          classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  approved:              { label: 'Утверждён',           classes: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  rejected:              { label: 'Отклонён',            classes: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
  archived:              { label: 'Архив',               classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
  overdue:               { label: 'Просрочено',          classes: 'bg-red-100 text-red-800 font-medium dark:bg-red-950 dark:text-red-300' },
  registered:            { label: 'Зарегистрирован',     classes: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  returned_for_revision: { label: 'На доработку',        classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  // Route stages
  pending:               { label: 'Ожидание',            classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  in_progress:           { label: 'В работе',            classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  skipped:               { label: 'Пропущен',            classes: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' },
  // Tasks
  new:                   { label: 'Новая',               classes: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  // Calls
  active:                { label: 'Активный',            classes: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  ended:                 { label: 'Завершён',            classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  missed:                { label: 'Пропущен',            classes: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  cancelled:             { label: 'Отменён',             classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  // GIS / Disaster statuses
  monitoring:            { label: 'Мониторинг',          classes: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  resolved:              { label: 'Устранена',           classes: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  // GIS / Disaster severity
  low:                   { label: 'Низкая',              classes: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  medium:                { label: 'Средняя',             classes: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' },
  high:                  { label: 'Высокая',             classes: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  critical:              { label: 'Критическая',         classes: 'bg-red-50 text-red-800 font-medium dark:bg-red-950 dark:text-red-300' },
  // General
  completed:             { label: 'Завершена',           classes: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
};

interface StatusBadgeProps {
  status: StatusVariant | string;
  /** Override the auto-derived label */
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StatusVariant];
  const displayLabel = label ?? config?.label ?? status;
  const classes = config?.classes ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/10',
        classes,
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}
