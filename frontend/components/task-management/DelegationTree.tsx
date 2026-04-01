'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GitBranch, UserCheck, Building2, X, Loader2 } from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import type { ITmTaskDelegationChain } from '@/interfaces/ITaskManagement';
import { cn } from '@/lib/utils';

interface DelegationTreeProps {
  taskId: string;
  canRevoke?: boolean;
}

export function DelegationTree({ taskId, canRevoke = false }: DelegationTreeProps) {
  const queryClient = useQueryClient();

  const { data: chain = [], isLoading } = useQuery({
    queryKey: ['tm-delegation-chain', taskId],
    queryFn: () => taskManagementApi.getDelegationChain(taskId),
  });

  const revokeMutation = useMutation({
    mutationFn: (assignmentId: string) => taskManagementApi.revokeAssignment(taskId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-delegation-chain', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tm-task', taskId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading delegation chain...
      </div>
    );
  }

  if (chain.length === 0) {
    return (
      <div className="text-sm text-slate-400 italic">No delegation chain — task not yet assigned.</div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-3">
        <GitBranch className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">Delegation Chain</span>
        <Badge variant="secondary" className="text-xs">{chain.length} step{chain.length !== 1 ? 's' : ''}</Badge>
      </div>

      <div className="space-y-1">
        {chain.map((entry: ITmTaskDelegationChain, idx) => (
          <div
            key={entry.id}
            className={cn(
              'flex items-start gap-2',
              entry.isRevoked && 'opacity-40',
            )}
            style={{ paddingLeft: `${(idx) * 20}px` }}
          >
            {/* Connector */}
            {idx > 0 && (
              <div className="flex flex-col items-center mt-1 -ml-3 mr-1">
                <div className="w-3 h-3 border-l-2 border-b-2 border-slate-300 rounded-bl" />
              </div>
            )}

            <div
              className={cn(
                'flex-1 flex items-center justify-between bg-white rounded-lg border px-3 py-2 text-sm',
                idx === chain.length - 1 && !entry.isRevoked
                  ? 'border-blue-200 bg-blue-50/50'
                  : 'border-slate-200',
              )}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {entry.toUser ? (
                    <UserCheck className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Building2 className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {entry.toUser?.name ?? entry.toDepartment?.name ?? entry.toRole ?? '—'}
                    </span>
                    {entry.isRevoked && (
                      <Badge variant="outline" className="text-xs text-slate-400">revoked</Badge>
                    )}
                    {idx === chain.length - 1 && !entry.isRevoked && (
                      <Badge className="text-xs bg-blue-600">current</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    <span>Delegated by {entry.fromUser.name}</span>
                    <span className="mx-1">·</span>
                    <span>{formatDate(entry.delegatedAt)}</span>
                    {entry.reason && (
                      <>
                        <span className="mx-1">·</span>
                        <span className="italic">"{entry.reason}"</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-2">
                <Badge variant="outline" className="text-xs text-slate-400">
                  L{entry.level}
                </Badge>
                {canRevoke && !entry.isRevoked && idx === chain.length - 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => revokeMutation.mutate(entry.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Revoke delegation</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
