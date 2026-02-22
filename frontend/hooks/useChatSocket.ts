'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { IChatMessage } from '@/interfaces/IChatMessage';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ??
  'http://localhost:8008';

export interface TypingUser {
  userId: number;
  name: string;
}

export function useChatSocket(accessToken: string | null, room: string) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!accessToken || !room) return;

    const chatSocket = io(`${WS_URL}/chat`, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: accessToken },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });

    chatSocket.on('connect', () => {
      setConnected(true);
      // DM rooms are not auto-joined on connection — explicitly join first, then
      // request history only after the server confirms join (chat:joined event).
      // Dept and global rooms are auto-joined by the gateway on connection.
      if (room.startsWith('dm:')) {
        chatSocket.emit('chat:join', { room });
      } else {
        chatSocket.emit('chat:history', { room, limit: 50 });
      }
    });

    // Server confirms DM room was joined → now safe to request history
    chatSocket.on('chat:joined', (data: { room: string }) => {
      chatSocket.emit('chat:history', { room: data.room, limit: 50 });
    });

    chatSocket.on('disconnect', () => {
      setConnected(false);
    });

    chatSocket.on('chat:message', (msg: IChatMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    chatSocket.on(
      'chat:history',
      (data: { items: IChatMessage[] } | IChatMessage[]) => {
        const items = Array.isArray(data) ? data : data.items;
        setMessages(items);
      },
    );

    chatSocket.on(
      'chat:typing',
      (data: { userId: number; name: string; isTyping: boolean }) => {
        if (data.isTyping) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === data.userId)) return prev;
            return [...prev, { userId: data.userId, name: data.name }];
          });
          // Auto-clear after 3 seconds
          if (typingTimers.current[data.userId]) {
            clearTimeout(typingTimers.current[data.userId]);
          }
          typingTimers.current[data.userId] = setTimeout(() => {
            setTypingUsers((prev) =>
              prev.filter((u) => u.userId !== data.userId),
            );
          }, 3000);
        } else {
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId),
          );
          clearTimeout(typingTimers.current[data.userId]);
        }
      },
    );

    chatSocket.on('chat:error', (err: { message: string }) => {
      console.error('[chat] server error:', err.message);
    });

    socketRef.current = chatSocket;

    return () => {
      Object.values(typingTimers.current).forEach(clearTimeout);
      chatSocket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setMessages([]);
      setTypingUsers([]);
    };
  // Re-connect when room or token changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, room]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit('chat:message', { room, content });
    },
    [room],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      socketRef.current?.emit('chat:typing', { room, isTyping });
    },
    [room],
  );

  return { messages, connected, sendMessage, sendTyping, typingUsers };
}
