'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useCalls } from '@/context/calls-context';
import { useAuth } from '@/context/auth-context';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function ActiveCallDialog() {
  const { activeCall, hangUp, localStreamRef, remoteStreamRef } = useCalls();
  const { user } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);

  const isOpen = activeCall?.status === 'active' || activeCall?.status === 'pending';
  const isConnecting = activeCall?.status === 'pending';

  // Attach media streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  });
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  });

  // Duration timer
  useEffect(() => {
    if (activeCall?.status === 'active') {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall?.status]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = micMuted; // toggle
      });
    }
    setMicMuted((prev) => !prev);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = videoMuted; // toggle
      });
    }
    setVideoMuted((prev) => !prev);
  };

  if (!activeCall) return null;

  // Show the OTHER person — whoever is not the current user
  const otherParty =
    activeCall.initiator?.id === user?.id
      ? activeCall.receiver
      : activeCall.initiator;
  const otherName = otherParty?.name ?? 'Собеседник';

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-none w-screen h-screen p-0 border-0 bg-black/95 flex flex-col [&>button]:hidden"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {isConnecting ? 'Вызов…' : `Звонок с ${otherName}`}
        </DialogTitle>

        {/* Remote video */}
        <div className="relative flex-1 overflow-hidden">
          {remoteStreamRef.current ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            /* Placeholder while connecting */
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-bold text-foreground">
                {getInitials(otherName)}
              </div>
              <p className="text-lg font-semibold text-white">{otherName}</p>
              <p className="text-sm text-white/60">
                {isConnecting ? 'Вызов…' : 'Подключение…'}
              </p>
            </div>
          )}

          {/* Local video PiP */}
          {localStreamRef.current && activeCall.hasVideo && (
            <div className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-xl border-2 border-white/20 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Duration + caller name overlay */}
          <div className="absolute left-0 top-0 p-4 text-white">
            <p className="text-sm font-semibold drop-shadow">{otherName}</p>
            {activeCall.status === 'active' && (
              <p className="text-xs text-white/70 drop-shadow">
                {formatDuration(elapsed)}
              </p>
            )}
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-center gap-4 bg-black/80 py-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={toggleMic}
            title={micMuted ? 'Включить микрофон' : 'Выключить микрофон'}
          >
            {micMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>

          {activeCall.hasVideo && (
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={toggleVideo}
              title={videoMuted ? 'Включить камеру' : 'Выключить камеру'}
            >
              {videoMuted ? (
                <VideoOff className="h-5 w-5" />
              ) : (
                <Video className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Hang up */}
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={() => hangUp(activeCall.id)}
            title="Завершить звонок"
          >
            <Phone className="h-6 w-6 rotate-[135deg]" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
