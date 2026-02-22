'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { useAuth } from '@/context/auth-context';
import { useChatSocket } from '@/hooks/useChatSocket';
import { RoomList, ChatRoom } from './components/room-list';
import { MessageList } from './components/message-list';
import { MessageInput } from './components/message-input';
import { Role } from '@/enums/RoleEnum';

/* ------------------------------------------------------------------ */
/* Page shell — protected                                               */
/* ------------------------------------------------------------------ */

export default function ChatPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.chat"
      deniedDescription="Раздел чата доступен пользователям с правом чтения чата."
    >
      <ChatContent />
    </ProtectedRouteGate>
  );
}

/* ------------------------------------------------------------------ */
/* Content                                                              */
/* ------------------------------------------------------------------ */

/** Canonical DM room id: always min_max so both sides agree. */
function buildDmRoom(myId: number, otherId: number): string {
  return `dm:${Math.min(myId, otherId)}_${Math.max(myId, otherId)}`;
}

function ChatContent() {
  const { user, accessToken } = useAuth();
  const searchParams = useSearchParams();

  // ?with=<userId> from Contacts page — opens a DM room
  const withUserId = Number(searchParams.get('with') ?? 0) || null;
  const dmContactName = searchParams.get('name') ?? null;

  // Build room list
  const rooms = useMemo<ChatRoom[]>(() => {
    const list: ChatRoom[] = [];
    if (user?.department) {
      list.push({
        id: `dept:${user.department.id}`,
        label: user.department.name,
        isGlobal: false,
      });
    }
    list.push({ id: 'global', label: 'Общий', isGlobal: true });
    // Inject DM room if requested via query param
    if (withUserId && user?.id) {
      list.unshift({
        id: buildDmRoom(user.id, withUserId),
        label: dmContactName ?? `DM #${withUserId}`,
        isGlobal: false,
        isDm: true,
      });
    }
    return list;
  }, [user, withUserId, dmContactName]);

  // Active room — default to DM if requested, else first available
  const [activeRoom, setActiveRoom] = useState<string>('global');

  // Once rooms are known, set default (only once)
  const defaultSet = useRef(false);
  useEffect(() => {
    if (defaultSet.current || rooms.length === 0) return;
    defaultSet.current = true;
    setActiveRoom(rooms[0].id);
  }, [rooms]);

  // Unread counts (reset when room is selected)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Socket connection for active room
  const { messages, connected, sendMessage, sendTyping, typingUsers } = useChatSocket(
    accessToken,
    activeRoom,
  );

  // Track unread messages from non-active rooms (messages received while on another room)
  const prevRoomRef = useRef(activeRoom);
  useEffect(() => {
    if (prevRoomRef.current !== activeRoom) {
      // Clear unread for newly selected room
      setUnreadCounts((prev) => ({ ...prev, [activeRoom]: 0 }));
      prevRoomRef.current = activeRoom;
    }
  }, [activeRoom]);

  // Determine if this user can write to the global room
  // Admin and Manager roles can write to global; Regular is read-only in global
  const canWriteToGlobal = user?.role === Role.Admin || user?.role === Role.Manager;
  const isReadOnly = activeRoom === 'global' && !canWriteToGlobal;

  // Loading state: show skeleton until first history load completes
  // We consider loading = true while messages array is not yet populated
  // (hook resets messages on room change, then receives chat:history)
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const prevActiveRoom = useRef(activeRoom);
  useEffect(() => {
    if (prevActiveRoom.current !== activeRoom) {
      setHistoryLoaded(false);
      prevActiveRoom.current = activeRoom;
    }
  }, [activeRoom]);
  useEffect(() => {
    if (messages.length >= 0 && connected) {
      // Mark loaded after a brief delay to let history arrive
      const t = setTimeout(() => setHistoryLoaded(true), 600);
      return () => clearTimeout(t);
    }
  }, [connected, messages.length]);

  const handleRoomSelect = (roomId: string) => {
    setActiveRoom(roomId);
  };

  const handleSend = (content: string) => {
    sendMessage(content);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-row overflow-hidden rounded-lg border bg-background shadow-sm">
      {/* Sidebar — room list */}
      <RoomList
        rooms={rooms}
        activeRoom={activeRoom}
        unreadCounts={unreadCounts}
        connected={connected}
        onSelectRoom={handleRoomSelect}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Room header */}
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">
            {rooms.find((r) => r.id === activeRoom)?.label ?? activeRoom}
          </h2>
          {isReadOnly && (
            <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              только чтение
            </span>
          )}
        </header>

        {/* Messages */}
        <MessageList
          messages={messages}
          currentUserId={user?.id}
          loading={!historyLoaded}
        />

        {/* Input */}
        {!isReadOnly && (
          <MessageInput
            onSend={handleSend}
            onTyping={sendTyping}
            typingUsers={typingUsers}
            disabled={!connected}
            placeholder={connected ? 'Напишите сообщение…' : 'Нет соединения…'}
          />
        )}

        {isReadOnly && (
          <div className="border-t bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
            Общий канал доступен только для чтения вашей роли.
          </div>
        )}
      </div>
    </div>
  );
}
