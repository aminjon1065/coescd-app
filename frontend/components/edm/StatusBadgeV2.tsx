import { cn } from '@/lib/utils';
import type { DocV2Status } from '@/interfaces/IDocumentV2';

const CONFIG: Record<DocV2Status, { label: string; className: string }> = {
  draft:    { label: 'Черновик',     className: 'bg-[--status-draft-bg]     text-[--status-draft-fg]' },
  review:   { label: 'На проверке',  className: 'bg-[--status-in-route-bg]  text-[--status-in-route-fg]' },
  approval: { label: 'Согласование', className: 'bg-[--status-pending-bg]   text-[--status-pending-fg]' },
  signed:   { label: 'Подписан',     className: 'bg-[--status-approved-bg]  text-[--status-approved-fg]' },
  archived: { label: 'Архив',        className: 'bg-muted text-muted-foreground' },
  rejected: { label: 'Отклонён',     className: 'bg-[--status-rejected-bg]  text-[--status-rejected-fg]' },
};

interface Props {
  status: DocV2Status;
  className?: string;
}

export function StatusBadgeV2({ status, className }: Props) {
  const { label, className: base } = CONFIG[status] ?? CONFIG.draft;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', base, className)}>
      {label}
    </span>
  );
}
