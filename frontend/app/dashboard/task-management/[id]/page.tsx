'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckSquare,
  MessageSquare,
  GitBranch,
  History,
  FileText,
  Zap,
  Loader2,
  Pencil,
  Trash2,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import { useTmTaskSocket } from '@/hooks/useTmTaskSocket';
import { TaskChecklistPanel } from '@/components/task-management/TaskChecklistPanel';
import { TaskCommentThread } from '@/components/task-management/TaskCommentThread';
import { DelegationTree } from '@/components/task-management/DelegationTree';
import type { ITmTask, TmTaskStatus, TmTaskPriority } from '@/interfaces/ITaskManagement';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isPast } from 'date-fns';

const STATUS_COLORS: Record<TmTaskStatus, string> = {
  draft:       'bg-slate-100 text-slate-600',
  created:     'bg-slate-100 text-slate-700',
  assigned:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  in_review:   'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  closed:      'bg-slate-200 text-slate-500',
  blocked:     'bg-red-100 text-red-700',
  rejected:    'bg-rose-100 text-rose-700',
  reopened:    'bg-orange-100 text-orange-700',
};

const PRIORITY_COLORS: Record<TmTaskPriority, string> = {
  low:      'bg-slate-100 text-slate-600',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_TRANSITIONS: Record<TmTaskStatus, TmTaskStatus[]> = {
  draft:       ['created'],
  created:     ['assigned'],
  assigned:    ['in_progress', 'blocked', 'rejected'],
  in_progress: ['in_review', 'blocked'],
  in_review:   ['completed', 'rejected', 'in_progress'],
  completed:   ['closed', 'reopened'],
  closed:      ['reopened'],
  blocked:     ['assigned'],
  rejected:    ['assigned', 'closed'],
  reopened:    ['assigned'],
};

const TYPE_LABELS: Record<string, string> = {
  simple:           'Simple',
  checklist:        'Checklist',
  workflow_driven:  'Workflow-Driven',
  document_linked:  'Document-Linked',
  incident_related: 'Incident-Related',
};

function SlaCountdown({ deadline, breached }: { deadline: string; breached: boolean }) {
  const date = new Date(deadline);
  const overdue = isPast(date);

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm',
        breached || overdue ? 'text-red-600' : 'text-slate-600',
      )}
    >
      <Clock className={cn('w-3.5 h-3.5', breached || overdue ? 'text-red-500' : 'text-slate-400')} />
      {breached || overdue
        ? `Overdue by ${formatDistanceToNow(date)}`
        : `${formatDistanceToNow(date, { addSuffix: true })}`}
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'checklist' | 'comments' | 'subtasks' | 'delegation'>('comments');

  // Real-time updates for this task
  useTmTaskSocket({ taskId: id });

  const { data: task, isLoading } = useQuery<ITmTask>({
    queryKey: ['tm-task', id],
    queryFn: () => taskManagementApi.getTask(id),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: TmTaskStatus) =>
      taskManagementApi.changeStatus(id, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tm-task', id] }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ITmTask>) => taskManagementApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-task', id] });
      setEditingDesc(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => taskManagementApi.deleteTask(id),
    onSuccess: () => router.push('/dashboard/task-management/list'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <p className="text-sm">Task not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const checklistCompleted = task.checklistItems?.filter((i) => i.isCompleted).length ?? 0;
  const checklistTotal = task.checklistItems?.length ?? 0;

  const nextStatuses = STATUS_TRANSITIONS[task.status] ?? [];

  const startEditDesc = () => {
    setDescDraft(task.description ?? '');
    setEditingDesc(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-sm text-slate-500">{task.taskNumber}</span>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/dashboard/task-management/${id}/history`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <History className="w-3.5 h-3.5" />
              History
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 gap-1.5 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete task?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will soft-delete the task. It can be restored by an administrator.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        {/* ── Left Column (main content) ─────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Title + status badge */}
          <div>
            <div className="flex items-start gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-slate-900 flex-1 leading-tight">
                {task.title}
              </h1>
              {task.slaBreached && (
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                  </TooltipTrigger>
                  <TooltipContent>SLA Breached</TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={cn('text-xs', STATUS_COLORS[task.status])}>
                {task.status.replace('_', ' ')}
              </Badge>
              <Badge variant="secondary" className={cn('text-xs capitalize', PRIORITY_COLORS[task.priority])}>
                {task.priority}
              </Badge>
              <span className="text-xs text-slate-400">{TYPE_LABELS[task.type]}</span>
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Parent task breadcrumb */}
          {task.parentTask && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span>Subtask of</span>
              <Link
                href={`/dashboard/task-management/${task.parentTask.id}`}
                className="text-blue-600 hover:underline font-medium flex items-center gap-1"
              >
                {task.parentTask.taskNumber}: {task.parentTask.title}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-700">Description</h3>
              {!editingDesc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-slate-400 hover:text-slate-700"
                  onClick={startEditDesc}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  rows={5}
                  className="text-sm resize-none"
                  placeholder="Add a description..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateMutation.mutate({ description: descDraft })}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setEditingDesc(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : task.description ? (
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                {task.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">No description provided.</p>
            )}
          </div>

          {/* Blocked / rejected reason */}
          {task.blockedReason && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-xs font-medium text-red-700 mb-0.5">Blocked reason</p>
              <p className="text-sm text-red-600">{task.blockedReason}</p>
            </div>
          )}
          {task.rejectionReason && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
              <p className="text-xs font-medium text-rose-700 mb-0.5">Rejection reason</p>
              <p className="text-sm text-rose-600">{task.rejectionReason}</p>
            </div>
          )}

          {/* Tab bar */}
          <div className="border-b border-slate-200">
            <div className="flex gap-1">
              {[
                { key: 'comments', label: 'Comments', icon: MessageSquare },
                { key: 'checklist', label: `Checklist (${checklistCompleted}/${checklistTotal})`, icon: CheckSquare },
                { key: 'subtasks', label: `Subtasks (${task.subtasks?.length ?? 0})`, icon: GitBranch },
                { key: 'delegation', label: 'Delegation', icon: GitBranch },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors',
                    activeTab === key
                      ? 'border-blue-600 text-blue-700 font-medium'
                      : 'border-transparent text-slate-500 hover:text-slate-700',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="pb-6">
            {activeTab === 'comments' && (
              <TaskCommentThread taskId={task.id} />
            )}

            {activeTab === 'checklist' && (
              <TaskChecklistPanel
                taskId={task.id}
                items={task.checklistItems ?? []}
              />
            )}

            {activeTab === 'subtasks' && (
              <div className="space-y-2">
                {task.subtasks && task.subtasks.length > 0 ? (
                  task.subtasks.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/dashboard/task-management/${sub.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
                    >
                      <Badge
                        variant="secondary"
                        className={cn('text-xs flex-shrink-0', STATUS_COLORS[sub.status])}
                      >
                        {sub.status.replace('_', ' ')}
                      </Badge>
                      <span className="font-mono text-xs text-slate-400 flex-shrink-0">
                        {sub.taskNumber}
                      </span>
                      <span className="text-sm text-slate-700 group-hover:text-blue-700 flex-1 line-clamp-1">
                        {sub.title}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs flex-shrink-0 capitalize', PRIORITY_COLORS[sub.priority])}
                      >
                        {sub.priority}
                      </Badge>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic text-center py-4">No subtasks.</p>
                )}
              </div>
            )}

            {activeTab === 'delegation' && (
              <DelegationTree taskId={task.id} canRevoke />
            )}
          </div>
        </div>

        {/* ── Right Sidebar ─────────────────────────────── */}
        <div className="w-72 flex-shrink-0 space-y-5 overflow-y-auto">

          {/* Status change */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</h3>
            <Badge
              variant="secondary"
              className={cn('text-sm w-full justify-center py-1.5', STATUS_COLORS[task.status])}
            >
              {task.status.replace('_', ' ')}
            </Badge>
            {nextStatuses.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-400">Move to</p>
                <div className="flex flex-col gap-1">
                  {nextStatuses.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="text-xs justify-start gap-2 h-7"
                      onClick={() => statusMutation.mutate(s)}
                      disabled={statusMutation.isPending}
                    >
                      {statusMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full flex-shrink-0',
                            STATUS_COLORS[s].replace(/text-\S+/, '').trim(),
                          )}
                        />
                      )}
                      {s.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</h3>

            <div className="space-y-2.5 text-sm">
              {/* Priority */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Priority</span>
                <Badge
                  variant="secondary"
                  className={cn('text-xs capitalize', PRIORITY_COLORS[task.priority])}
                >
                  {task.priority}
                </Badge>
              </div>

              {/* Assignee */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Assignee</span>
                {task.assigneeUser ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                        {task.assigneeUser.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-slate-700">{task.assigneeUser.name}</span>
                  </div>
                ) : task.assigneeDepartment ? (
                  <span className="text-xs text-slate-500 italic">{task.assigneeDepartment.name}</span>
                ) : (
                  <span className="text-xs text-slate-300">Unassigned</span>
                )}
              </div>

              {/* Department */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Department</span>
                <span className="text-xs text-slate-700">{task.department?.name ?? '—'}</span>
              </div>

              {/* Created by */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Created by</span>
                <span className="text-xs text-slate-700">{task.createdBy.name}</span>
              </div>

              {/* Created at */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Created</span>
                <span className="text-xs text-slate-500">
                  {format(new Date(task.createdAt), 'dd MMM yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dates & SLA</h3>
            <div className="space-y-2 text-xs">
              {task.dueAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Due date</span>
                  <span
                    className={cn(
                      'font-medium',
                      task.dueAt && isPast(new Date(task.dueAt)) && !['completed', 'closed'].includes(task.status)
                        ? 'text-red-600'
                        : 'text-slate-700',
                    )}
                  >
                    {format(new Date(task.dueAt), 'dd MMM yyyy')}
                  </span>
                </div>
              )}
              {task.startedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Started</span>
                  <span className="text-slate-700">{format(new Date(task.startedAt), 'dd MMM yyyy')}</span>
                </div>
              )}
              {task.completedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Completed</span>
                  <span className="text-slate-700">{format(new Date(task.completedAt), 'dd MMM yyyy')}</span>
                </div>
              )}
              {task.estimatedHours && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estimated</span>
                  <span className="text-slate-700">{task.estimatedHours}h</span>
                </div>
              )}
              {task.actualHours && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Actual</span>
                  <span className="text-slate-700">{task.actualHours}h</span>
                </div>
              )}
              {task.slaDeadline && (
                <div className="pt-1 border-t border-slate-100">
                  <p className="text-slate-500 mb-1">SLA deadline</p>
                  <SlaCountdown deadline={task.slaDeadline} breached={task.slaBreached} />
                </div>
              )}
            </div>
          </div>

          {/* Linked document */}
          {task.linkedDocumentId && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Linked Document</h3>
              <Link
                href={`/dashboard/documents/${task.linkedDocumentId}`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                Document #{task.linkedDocumentId}
                {task.linkedDocumentVersion && (
                  <span className="text-xs text-slate-400">v{task.linkedDocumentVersion}</span>
                )}
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
            </div>
          )}

          {/* Linked incident */}
          {task.linkedIncidentId && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Linked Incident</h3>
              <Link
                href={`/dashboard/disasters/${task.linkedIncidentId}`}
                className="flex items-center gap-2 text-sm text-red-600 hover:underline"
              >
                <Zap className="w-4 h-4 flex-shrink-0" />
                Incident #{task.linkedIncidentId}
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
            </div>
          )}

          {/* Board placement */}
          {task.board && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Board</h3>
              <div className="text-sm">
                <span className="text-slate-700">{task.board.name}</span>
                {task.boardColumn && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.boardColumn.color }}
                    />
                    <span className="text-xs text-slate-500">{task.boardColumn.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
