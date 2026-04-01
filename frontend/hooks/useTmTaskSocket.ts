'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useTaskBoardStore } from '@/lib/stores/task-board-store';
import type { ITmTask, TmTaskStatus } from '@/interfaces/ITaskManagement';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8008';

type RoomMode = 'task' | 'board';

interface UseTmTaskSocketOptions {
  /** task UUID — pass when on the task detail page */
  taskId?: string;
  /** board UUID — pass when on the board page */
  boardId?: string;
}

/**
 * Connects to the /task-management Socket.IO namespace and joins the
 * appropriate rooms (task:{taskId} or board:{boardId}).
 *
 * On receiving server events the hook:
 *   - Invalidates the relevant React Query cache keys
 *   - Updates the Zustand board store for instant drag-drop consistency
 *
 * The socket is lazily created (one per page mount) and disconnected on unmount.
 */
export function useTmTaskSocket({ taskId, boardId }: UseTmTaskSocketOptions = {}) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const { updateTaskInBoard, removeTaskFromBoard } = useTaskBoardStore();

  useEffect(() => {
    const socket: Socket = io(`${SOCKET_URL}/task-management`, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join rooms after (re)connect
      if (taskId)  socket.emit('join-task',  { taskId });
      if (boardId) socket.emit('join-board', { boardId });
    });

    // ── task:updated ──────────────────────────────────────────────────────────
    socket.on('task:updated', ({ taskId: tid }: { taskId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['tm-task', tid] });
      void queryClient.invalidateQueries({ queryKey: ['tm-tasks'] });
    });

    // ── task:status-changed ───────────────────────────────────────────────────
    socket.on(
      'task:status-changed',
      ({ taskId: tid, to }: { taskId: string; from: TmTaskStatus; to: TmTaskStatus }) => {
        // Optimistically update the store so the board column re-renders immediately
        updateTaskInBoard(tid, { status: to } as Partial<ITmTask>);
        void queryClient.invalidateQueries({ queryKey: ['tm-task', tid] });
        void queryClient.invalidateQueries({ queryKey: ['tm-tasks'] });
        if (boardId) void queryClient.invalidateQueries({ queryKey: ['tm-board', boardId] });
      },
    );

    // ── task:assigned ─────────────────────────────────────────────────────────
    socket.on('task:assigned', ({ taskId: tid }: { taskId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['tm-task', tid] });
      void queryClient.invalidateQueries({ queryKey: ['tm-tasks'] });
    });

    // ── task:comment-added ────────────────────────────────────────────────────
    socket.on('task:comment-added', ({ taskId: tid }: { taskId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['tm-comments', tid] });
    });

    // ── task:comment-deleted ──────────────────────────────────────────────────
    socket.on('task:comment-deleted', ({ taskId: tid }: { taskId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['tm-comments', tid] });
    });

    // ── task:delegated ────────────────────────────────────────────────────────
    socket.on('task:delegated', ({ taskId: tid }: { taskId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['tm-delegation-chain', tid] });
      void queryClient.invalidateQueries({ queryKey: ['tm-task', tid] });
    });

    // ── task:moved ────────────────────────────────────────────────────────────
    socket.on(
      'task:moved',
      ({
        taskId: tid,
        fromColumnId,
        toColumnId,
      }: {
        taskId: string;
        fromColumnId: string | null;
        toColumnId: string;
      }) => {
        // Update the board store so other users' drags are reflected instantly
        if (fromColumnId) {
          updateTaskInBoard(tid, { boardColumn: { id: toColumnId } } as Partial<ITmTask>);
        }
        if (boardId) void queryClient.invalidateQueries({ queryKey: ['tm-board', boardId] });
      },
    );

    // ── task:created ──────────────────────────────────────────────────────────
    socket.on('task:created', () => {
      void queryClient.invalidateQueries({ queryKey: ['tm-tasks'] });
      if (boardId) void queryClient.invalidateQueries({ queryKey: ['tm-board', boardId] });
    });

    // ── task:escalated ────────────────────────────────────────────────────────
    socket.on('task:escalated', ({ taskId: tid }: { taskId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['tm-task', tid] });
      void queryClient.invalidateQueries({ queryKey: ['tm-tasks'] });
    });

    // ── board:reordered ───────────────────────────────────────────────────────
    socket.on('board:reordered', ({ boardId: bid }: { boardId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['tm-board', bid] });
    });

    return () => {
      if (taskId)  socket.emit('leave-task',  { taskId });
      if (boardId) socket.emit('leave-board', { boardId });
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, boardId]);

  return socketRef;
}
