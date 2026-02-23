'use client';

import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalls } from '@/context/calls-context';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';
}

export function IncomingCallOverlay() {
  const { incomingCall, acceptCall, rejectCall } = useCalls();

  if (!incomingCall || incomingCall.status !== 'pending') return null;

  const caller = incomingCall.initiator;
  const callerName = caller?.name ?? 'Неизвестный';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 overflow-hidden rounded-2xl border bg-background shadow-2xl">
      {/* Animated top border ring */}
      <div className="h-1 w-full animate-pulse bg-primary" />

      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {getInitials(callerName)}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{callerName}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {incomingCall.hasVideo ? (
                <>
                  <Video className="h-3 w-3" />
                  Видеозвонок
                </>
              ) : (
                <>
                  <Phone className="h-3 w-3" />
                  Голосовой звонок
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1 gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            size="sm"
            onClick={() => rejectCall(incomingCall.id)}
          >
            <PhoneOff className="h-4 w-4" />
            Отклонить
          </Button>
          <Button
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
            size="sm"
            onClick={() => acceptCall(incomingCall.id)}
          >
            <Phone className="h-4 w-4" />
            Принять
          </Button>
        </div>
      </div>
    </div>
  );
}
