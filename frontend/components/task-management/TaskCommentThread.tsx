'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CornerDownRight, Pencil, Trash2, Send } from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import type { ITmTaskComment } from '@/interfaces/ITaskManagement';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TaskCommentThreadProps {
  taskId: string;
  currentUserId?: number;
}

interface CommentItemProps {
  comment: ITmTaskComment;
  taskId: string;
  currentUserId?: number;
  isReply?: boolean;
}

function CommentItem({ comment, taskId, currentUserId, isReply = false }: CommentItemProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const editMutation = useMutation({
    mutationFn: (content: string) =>
      taskManagementApi.updateComment(taskId, comment.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-comments', taskId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => taskManagementApi.deleteComment(taskId, comment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tm-comments', taskId] }),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) =>
      taskManagementApi.addComment(taskId, { content, parentId: comment.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-comments', taskId] });
      setReplyContent('');
      setReplyOpen(false);
    },
  });

  const isOwn = currentUserId === comment.author.id;

  // Render content with @mention highlights
  const renderContent = (text: string) =>
    text.split(/(@\w+)/g).map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-blue-600 font-medium">
          {part}
        </span>
      ) : (
        part
      ),
    );

  return (
    <div className={cn('flex gap-2.5', isReply && 'ml-8')}>
      {/* Avatar */}
      <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
        <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
          {comment.author.name[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-medium text-slate-800">{comment.author.name}</span>
          {comment.isEdited && (
            <span className="text-[10px] text-slate-400 italic">(edited)</span>
          )}
          <span className="text-[10px] text-slate-400 ml-auto">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Content or Edit form */}
        {editing ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => editMutation.mutate(editContent)}
                disabled={editMutation.isPending || !editContent.trim()}
              >
                {editMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setEditing(false); setEditContent(comment.content); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {renderContent(comment.content)}
          </p>
        )}

        {/* Mention badges */}
        {comment.mentionUserIds?.length > 0 && !editing && (
          <div className="flex gap-1 mt-1">
            {comment.mentionUserIds.map((uid) => (
              <Badge key={uid} variant="outline" className="text-[10px] px-1 py-0">
                @user:{uid}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-2 mt-1.5">
            {!isReply && (
              <button
                className="text-[11px] text-slate-400 hover:text-blue-600 flex items-center gap-1"
                onClick={() => setReplyOpen(!replyOpen)}
              >
                <CornerDownRight className="w-3 h-3" />
                Reply
              </button>
            )}
            {isOwn && (
              <>
                <button
                  className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Delete
                </button>
              </>
            )}
          </div>
        )}

        {/* Reply form */}
        {replyOpen && (
          <div className="mt-2 flex gap-2">
            <Textarea
              autoFocus
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
              className="text-sm resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (replyContent.trim()) replyMutation.mutate(replyContent.trim());
                }
                if (e.key === 'Escape') setReplyOpen(false);
              }}
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => replyMutation.mutate(replyContent.trim())}
                disabled={replyMutation.isPending || !replyContent.trim()}
              >
                {replyMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => setReplyOpen(false)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                taskId={taskId}
                currentUserId={currentUserId}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskCommentThread({ taskId, currentUserId }: TaskCommentThreadProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['tm-comments', taskId],
    queryFn: () => taskManagementApi.getComments(taskId),
  });

  const addMutation = useMutation({
    mutationFn: (content: string) => taskManagementApi.addComment(taskId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-comments', taskId] });
      setNewComment('');
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addMutation.mutate(newComment.trim());
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading comments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing comments */}
      {comments.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-4">
          No comments yet. Be the first to add one.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment: ITmTaskComment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              taskId={taskId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {/* New comment input */}
      <div className="flex gap-2.5 pt-2 border-t border-slate-100">
        <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
          <AvatarFallback className="text-[10px] bg-slate-200 text-slate-600">Me</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Add a comment... (Shift+Enter for new line, Enter to submit)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSubmit}
              disabled={addMutation.isPending || !newComment.trim()}
            >
              {addMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
