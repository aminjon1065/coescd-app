'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Clock } from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import type { ITmTaskHistory, TmHistoryAction } from '@/interfaces/ITaskManagement';
import { format } from 'date-fns';

const ACTION_LABELS: Record<TmHistoryAction, string> = {
  created:           'Task created',
  assigned:          'Assigned',
  reassigned:        'Reassigned',
  status_changed:    'Status changed',
  priority_changed:  'Priority changed',
  due_date_changed:  'Due date changed',
  commented:         'Commented',
  attachment_added:  'Attachment added',
  attachment_removed:'Attachment removed',
  delegated:         'Delegated',
  escalated:         'Escalated',
  blocked:           'Blocked',
  reopened:          'Reopened',
  closed:            'Closed',
};

const ACTION_COLORS: Record<TmHistoryAction, string> = {
  created:           'bg-green-100 text-green-700',
  assigned:          'bg-blue-100 text-blue-700',
  reassigned:        'bg-blue-100 text-blue-700',
  status_changed:    'bg-purple-100 text-purple-700',
  priority_changed:  'bg-orange-100 text-orange-700',
  due_date_changed:  'bg-amber-100 text-amber-700',
  commented:         'bg-slate-100 text-slate-600',
  attachment_added:  'bg-teal-100 text-teal-700',
  attachment_removed:'bg-rose-100 text-rose-700',
  delegated:         'bg-indigo-100 text-indigo-700',
  escalated:         'bg-red-100 text-red-700',
  blocked:           'bg-red-100 text-red-700',
  reopened:          'bg-orange-100 text-orange-700',
  closed:            'bg-slate-200 text-slate-600',
};

function ValueDisplay({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  const display = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  return (
    <div>
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
      <pre className="text-xs text-slate-600 bg-slate-50 rounded p-1.5 mt-0.5 whitespace-pre-wrap font-mono max-w-xs overflow-auto">
        {display}
      </pre>
    </div>
  );
}

export default function TaskHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: history = [], isLoading } = useQuery<ITmTaskHistory[]>({
    queryKey: ['tm-history', id],
    queryFn: () => taskManagementApi.getHistory(id),
    enabled: !!id,
  });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-500"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to task
        </Button>
        <span className="text-slate-300">/</span>
        <h1 className="text-lg font-semibold text-slate-800">Audit Trail</h1>
        {!isLoading && (
          <Badge variant="secondary" className="ml-auto">
            {history.length} events
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No history recorded.</div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[23px] top-2 bottom-2 w-px bg-slate-200" />

          <div className="space-y-0">
            {history.map((entry, idx) => (
              <div key={entry.id} className="flex gap-4 group">
                {/* Timeline dot */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div
                    className={`w-[11px] h-[11px] rounded-full border-2 border-white mt-3 z-10 ${
                      idx === 0 ? 'bg-blue-500' : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Actor + action */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                          {entry.actor.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-slate-800">{entry.actor.name}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${ACTION_COLORS[entry.action]}`}
                      >
                        {ACTION_LABELS[entry.action]}
                      </Badge>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {format(new Date(entry.occurredAt), 'dd MMM yyyy, HH:mm:ss')}
                    </div>
                  </div>

                  {/* Notes */}
                  {entry.notes && (
                    <p className="text-xs text-slate-500 mt-1 italic ml-8">{entry.notes}</p>
                  )}

                  {/* Old / new values */}
                  {(entry.previousValue || Object.keys(entry.newValue).length > 0) && (
                    <div className="mt-2 ml-8 flex gap-4 flex-wrap">
                      {entry.previousValue && Object.keys(entry.previousValue).length > 0 && (
                        <ValueDisplay label="Previous" value={entry.previousValue} />
                      )}
                      {entry.newValue && Object.keys(entry.newValue).length > 0 && (
                        <ValueDisplay label="New" value={entry.newValue} />
                      )}
                    </div>
                  )}

                  {/* IP / metadata */}
                  {entry.ipAddress && (
                    <p className="text-[10px] text-slate-300 mt-1 ml-8">
                      IP: {entry.ipAddress}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
