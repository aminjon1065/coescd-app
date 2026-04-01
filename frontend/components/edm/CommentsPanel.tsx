'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, CheckCircle2, Loader2, Reply, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { addComment, deleteComment, listComments, resolveComment } from '@/lib/api/documents-v2';
import type { IDocComment } from '@/interfaces/IDocumentV2';

interface Props {
  documentId: string;
  currentUserId: number;
}

function CommentBubble({
  comment,
  documentId,
  currentUserId,
  onReply,
  isReply = false,
}: {
  comment: IDocComment;
  documentId: string;
  currentUserId: number;
  onReply: (parentId: string) => void;
  isReply?: boolean;
}) {
  const qc = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: () => resolveComment(documentId, comment.id, 'resolved'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-comments', documentId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(documentId, comment.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-comments', documentId] }),
  });

  const isOwn = comment.createdBy.id === currentUserId;
  const isResolved = comment.status !== 'open';

  return (
    <div className={cn('flex flex-col gap-1', isReply && 'ml-6 pl-3 border-l border-border')}>
      <div className={cn('rounded-lg p-3 bg-card border', isResolved && 'opacity-60')}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-[oklch(0.546_0.245_262.881)] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
              {comment.createdBy.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium truncate">{comment.createdBy.name}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ru })}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isReply && comment.status === 'open' && (
              <button
                onClick={() => resolveMutation.mutate()}
                className="text-muted-foreground hover:text-green-600 transition-colors"
                title="Отметить как решённый"
              >
                {resolveMutation.isPending
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <CheckCircle2 className="w-3 h-3" />}
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => deleteMutation.mutate()}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="Удалить"
              >
                {deleteMutation.isPending
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Trash2 className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        <p className="mt-1.5 text-xs text-foreground leading-relaxed">{comment.body}</p>

        {comment.anchor && (
          <p className="mt-1 text-[10px] text-muted-foreground italic border-l-2 border-border pl-2 truncate">
            «{comment.anchor.text}»
          </p>
        )}

        {isResolved && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-2.5 h-2.5" /> Решён
          </span>
        )}

        {!isReply && !isResolved && (
          <button
            onClick={() => onReply(comment.id)}
            className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Reply className="w-3 h-3" /> Ответить
          </button>
        )}
      </div>

      {/* Replies */}
      {comment.replies?.map((reply) => (
        <CommentBubble
          key={reply.id}
          comment={reply}
          documentId={documentId}
          currentUserId={currentUserId}
          onReply={onReply}
          isReply
        />
      ))}
    </div>
  );
}

export function CommentsPanel({ documentId, currentUserId }: Props) {
  const qc = useQueryClient();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [body, setBody] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['doc-comments', documentId],
    queryFn: () => listComments(documentId),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addComment(documentId, body, { parentId: replyTo ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-comments', documentId] });
      setBody('');
      setReplyTo(null);
    },
  });

  const openCount = comments.filter((c) => c.status === 'open').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Комментарии</span>
        </div>
        {openCount > 0 && (
          <span className="text-[10px] bg-[oklch(0.546_0.245_262.881)] text-white rounded-full px-1.5 py-0.5 font-medium">
            {openCount}
          </span>
        )}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 pr-1">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Нет комментариев</p>
        ) : (
          comments.map((c) => (
            <CommentBubble
              key={c.id}
              comment={c}
              documentId={documentId}
              currentUserId={currentUserId}
              onReply={setReplyTo}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex flex-col gap-2 border-t pt-3">
        {replyTo && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded">
            <span>Ответ на комментарий</span>
            <button onClick={() => setReplyTo(null)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Добавить комментарий..."
          className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button
          size="sm"
          disabled={!body.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate()}
          className="self-end text-xs bg-[oklch(0.546_0.245_262.881)] hover:bg-[oklch(0.48_0.24_262.881)] text-white dark:bg-[oklch(0.546_0.245_262.881)]"
        >
          {addMutation.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          Отправить
        </Button>
      </div>
    </div>
  );
}
