'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ICall } from '@/interfaces/ICall';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ??
  'http://localhost:8008';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface UseCallsSocketReturn {
  connected: boolean;
  incomingCall: ICall | null;
  activeCall: ICall | null;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteStreamRef: React.MutableRefObject<MediaStream | null>;
  initiateCall: (receiverId: number, hasVideo: boolean) => void;
  acceptCall: (callId: number) => void;
  rejectCall: (callId: number) => void;
  hangUp: (callId: number) => void;
}

export function useCallsSocket(
  accessToken: string | null,
): UseCallsSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Tracks which side we are for the current call (caller vs callee)
  const isCallerRef = useRef(false);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  // Ref mirror of activeCall — avoids stale-closure reads inside socket handlers
  // (socket handlers are registered once in useEffect([accessToken]) and never
  //  re-registered, so they must NOT read state directly)
  const activeCallRef = useRef<ICall | null>(null);

  const [connected, setConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<ICall | null>(null);
  const [activeCall, setActiveCall] = useState<ICall | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    pendingCandidates.current = [];
  }, []);

  const createPeerConnection = useCallback(
    (callId: number, hasVideo: boolean): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('call:ice-candidate', {
            callId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0] ?? null;
      };

      pcRef.current = pc;
      return pc;
    },
    [],
  );

  const getUserMediaStream = useCallback(
    async (hasVideo: boolean): Promise<MediaStream> => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: hasVideo,
      });
      localStreamRef.current = stream;
      return stream;
    },
    [],
  );

  // ── Public API ─────────────────────────────────────────────────────────────

  const initiateCall = useCallback(
    (receiverId: number, hasVideo: boolean) => {
      if (!socketRef.current?.connected) return;
      isCallerRef.current = true;
      socketRef.current.emit('call:invite', { receiverId, hasVideo });
    },
    [],
  );

  const acceptCall = useCallback(
    (callId: number) => {
      if (!socketRef.current?.connected) return;
      isCallerRef.current = false;
      socketRef.current.emit('call:accept', { callId });
    },
    [],
  );

  const rejectCall = useCallback((callId: number) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('call:reject', { callId });
    setIncomingCall(null);
  }, []);

  const hangUp = useCallback((callId: number) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('call:hangup', { callId });
    closePeerConnection();
    setActiveCall(null);
    setIncomingCall(null);
  }, [closePeerConnection]);

  // ── Socket lifecycle ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${WS_URL}/calls`, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: accessToken },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });

    // ── connect ──────────────────────────────────────────────────────────────
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // ── call:incoming — receiver sees an incoming call ────────────────────────
    socket.on('call:incoming', (call: ICall) => {
      setIncomingCall(call);
    });

    // ── call:ringing — caller gets notified the invite was sent ───────────────
    socket.on('call:ringing', (call: ICall) => {
      const pending = { ...call, status: 'pending' as const };
      activeCallRef.current = pending;
      setActiveCall(pending);
    });

    // ── call:accepted — both parties: start WebRTC ────────────────────────────
    socket.on('call:accepted', async (call: ICall) => {
      setIncomingCall(null);
      activeCallRef.current = call; // sync ref BEFORE state so call:offer can read it
      setActiveCall(call);

      // Caller side: create offer
      if (isCallerRef.current) {
        try {
          const stream = await getUserMediaStream(call.hasVideo);
          const pc = createPeerConnection(call.id, call.hasVideo);
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:offer', { callId: call.id, sdp: offer });
        } catch (err) {
          console.error('[calls] Failed to create offer:', err);
          socket.emit('call:hangup', { callId: call.id });
        }
      }
    });

    // ── call:rejected — caller sees the rejection ─────────────────────────────
    socket.on('call:rejected', (_call: ICall) => {
      closePeerConnection();
      activeCallRef.current = null;
      setActiveCall(null);
      setIncomingCall(null);
    });

    // ── call:ended — either party hung up ─────────────────────────────────────
    socket.on('call:ended', (_call: ICall) => {
      closePeerConnection();
      activeCallRef.current = null;
      setActiveCall(null);
      setIncomingCall(null);
    });

    // ── call:offer — receiver gets the WebRTC offer ───────────────────────────
    socket.on(
      'call:offer',
      async (data: { callId: number; sdp: RTCSessionDescriptionInit }) => {
        // Only the receiver handles the offer.  Use ref (not state) to avoid
        // the classic stale-closure problem — this handler is registered once.
        if (isCallerRef.current) return;

        try {
          const currentCall = activeCallRef.current;
          const hasVideo = currentCall?.hasVideo ?? false;
          const stream = await getUserMediaStream(hasVideo);
          const pc = createPeerConnection(data.callId, hasVideo);
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          // Drain any queued ICE candidates
          for (const c of pendingCandidates.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidates.current = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:answer', { callId: data.callId, sdp: answer });
        } catch (err) {
          console.error('[calls] Failed to create answer:', err);
          socket.emit('call:hangup', { callId: data.callId });
        }
      },
    );

    // ── call:answer — caller gets the answer ──────────────────────────────────
    socket.on(
      'call:answer',
      async (data: { callId: number; sdp: RTCSessionDescriptionInit }) => {
        if (!pcRef.current) return;
        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(data.sdp),
          );
          // Drain queued candidates
          for (const c of pendingCandidates.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidates.current = [];
        } catch (err) {
          console.error('[calls] Failed to set remote description:', err);
        }
      },
    );

    // ── call:ice-candidate — relay ICE candidates ─────────────────────────────
    socket.on(
      'call:ice-candidate',
      async (data: { callId: number; candidate: RTCIceCandidateInit }) => {
        if (!data.candidate) return;
        if (pcRef.current?.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(
              new RTCIceCandidate(data.candidate),
            );
          } catch (err) {
            console.warn('[calls] Failed to add ICE candidate:', err);
          }
        } else {
          // Queue until remote description is set
          pendingCandidates.current.push(data.candidate);
        }
      },
    );

    socket.on('calls:error', (err: { message: string }) => {
      console.error('[calls] server error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      closePeerConnection();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setIncomingCall(null);
      setActiveCall(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return {
    connected,
    incomingCall,
    activeCall,
    localStreamRef,
    remoteStreamRef,
    initiateCall,
    acceptCall,
    rejectCall,
    hangUp,
  };
}
