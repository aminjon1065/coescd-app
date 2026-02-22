'use client';

import { cn } from '@/lib/utils';
import { Globe, Hash, MessageCircle } from 'lucide-react';

export interface ChatRoom {
  id: string;       // e.g. 'dept:3', 'global', or 'dm:2_5'
  label: string;
  isGlobal: boolean;
  isDm?: boolean;
}

interface RoomListProps {
  rooms: ChatRoom[];
  activeRoom: string;
  unreadCounts: Record<string, number>;
  connected: boolean;
  onSelectRoom: (roomId: string) => void;
}

export function RoomList({
  rooms,
  activeRoom,
  unreadCounts,
  connected,
  onSelectRoom,
}: RoomListProps) {
  return (
    <aside className="flex h-full w-56 flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Чат</span>
        <span
          className={cn(
            'ml-auto h-2 w-2 rounded-full',
            connected ? 'bg-green-500' : 'bg-muted-foreground',
          )}
          title={connected ? 'Подключено' : 'Нет соединения'}
        />
      </div>

      {/* Room items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {rooms.map((room) => {
          const unread = unreadCounts[room.id] ?? 0;
          const isActive = room.id === activeRoom;
          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {room.isGlobal ? (
                <Globe className="h-4 w-4 shrink-0" />
              ) : room.isDm ? (
                <MessageCircle className="h-4 w-4 shrink-0" />
              ) : (
                <Hash className="h-4 w-4 shrink-0" />
              )}
              <span className="flex-1 truncate">{room.label}</span>
              {unread > 0 && !isActive && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
