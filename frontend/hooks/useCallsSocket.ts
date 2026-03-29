'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ICall } from '@/interfaces/ICall';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ??
  'http://localhost:8008';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8008/api';

/** Public STUN-only fallback used when the TURN credential fetch fails */
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface UseCallsSocketReturn {
  connected: boolean;
  incomingCall: ICall | null;
  activeCall: ICall | null;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteStreamRef: React.MutableRefObject<MediaStream | null>;
  /** React state mirrors of the stream refs — use these for conditional rendering. */
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  /** Non-null when getUserMedia failed; cleared by clearMediaError or on hang-up. */
  mediaError: string | null;
  clearMediaError: () => void;
  /**
   * Raw ICE connection state of the active peer connection.
   * - null   → no call in progress
   * - 'disconnected' → transient loss; WebRTC may self-heal
   * - 'failed'       → permanent; call is auto-terminated
   */
  iceConnState: RTCIceConnectionState | null;
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

  // Ref mirror of accessToken — lets fetchTurnCredentials (a stable [] callback)
  // always read the latest token without depending on it directly.
  const accessTokenRef = useRef<string | null>(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  // Cache TURN credentials so we don't re-fetch for every call (TTL is 24 h).
  // Shape: { iceServers, expiresAt } where expiresAt is a Unix timestamp (sec).
  const turnCredentialsRef = useRef<{
    iceServers: RTCIceServer[];
    expiresAt: number;
  } | null>(null);

  const [connected, setConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<ICall | null>(null);
  const [activeCall, setActiveCall] = useState<ICall | null>(null);
  // React-state mirrors of the stream refs so components can re-render when
  // streams arrive/depart without polling or unrelated state changes.
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [iceConnState, setIceConnState] = useState<RTCIceConnectionState | null>(null);

  const clearMediaError = useCallback(() => setMediaError(null), []);

  /**
   * Fetch short-lived TURN credentials from the backend and cache them for the
   * duration of their TTL (24 h).  Stable reference ([] deps) — reads the
   * latest accessToken through accessTokenRef to avoid stale closures.
   *
   * Falls back to public STUN-only servers on any fetch error so calls can
   * still connect in environments where the backend is unreachable.
   */
  const fetchTurnCredentials = useCallback(async (): Promise<RTCIceServer[]> => {
    const now = Math.floor(Date.now() / 1000);

    // Return cached credentials while they're still valid (60 s safety margin)
    if (
      turnCredentialsRef.current &&
      turnCredentialsRef.current.expiresAt > now + 60
    ) {
      return turnCredentialsRef.current.iceServers;
    }

    try {
      const res = await fetch(`${API_URL}/calls/turn-credentials`, {
        headers: { Authorization: `Bearer ${accessTokenRef.current ?? ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { iceServers: RTCIceServer[]; ttl: number };
      turnCredentialsRef.current = {
        iceServers: data.iceServers,
        expiresAt: now + data.ttl,
      };
      return data.iceServers;
    } catch (err) {
      console.warn(
        '[calls] Failed to fetch TURN credentials — falling back to STUN only:',
        err,
      );
      return FALLBACK_ICE_SERVERS;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    pendingCandidates.current = [];
    // Clear React-state mirrors so the UI unmounts video elements immediately.
    setLocalStream(null);
    setRemoteStream(null);
    setMediaError(null);
    setIceConnState(null);
  }, []);

  const createPeerConnection = useCallback(
    (callId: number, hasVideo: boolean, iceServers: RTCIceServer[]): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers });

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('call:ice-candidate', {
            callId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? null;
        // Update both the ref (used by WebRTC internals) and the state mirror
        // (triggers a React re-render so the video element mounts immediately).
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        setIceConnState(state);

        if (state === 'failed') {
          // Permanent failure — auto-terminate the call.
          // Emit hangup first so the server and remote peer are notified.
          const callId = activeCallRef.current?.id;
          if (callId && socketRef.current?.connected) {
            socketRef.current.emit('call:hangup', { callId });
          }
          // closePeerConnection resets mediaError to null; we overwrite it
          // immediately after so React's batched update keeps the error message.
          closePeerConnection();
          activeCallRef.current = null;
          setActiveCall(null);
          setIncomingCall(null);
          setMediaError('Соединение прервано. Повторите вызов.');
        }
      };

      pcRef.current = pc;
      return pc;
    },
    // All referenced setters (setRemoteStream, setIceConnState, setMediaError,
    // setActiveCall, setIncomingCall) are stable useState setters.
    // closePeerConnection has [] deps and is therefore a stable reference too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const getUserMediaStream = useCallback(
    async (hasVideo: boolean): Promise<MediaStream> => {
      // First attempt: request exactly what the call needs.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: hasVideo,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
      } catch (err) {
        const name = err instanceof DOMException ? err.name : 'UnknownError';

        // Camera unavailable but audio might still work — fall back gracefully.
        if (hasVideo && (name === 'NotFoundError' || name === 'NotReadableError')) {
          setMediaError('Камера недоступна. Продолжаем только с аудио.');
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });
            localStreamRef.current = audioOnly;
            setLocalStream(audioOnly);
            return audioOnly;
          } catch {
            // Audio also failed — fall through to the hard-error path below.
          }
        }

        // Map DOMException names to user-facing messages.
        const message =
          name === 'NotAllowedError'
            ? 'Доступ к камере/микрофону запрещён. Разрешите доступ в настройках браузера.'
            : name === 'NotFoundError'
              ? 'Микрофон не найден. Подключите аудиоустройство и повторите попытку.'
              : name === 'NotReadableError'
                ? 'Устройство занято другим приложением.'
                : `Ошибка медиаустройства: ${name}`;

        setMediaError(message);
        // Re-throw so the call:accepted / call:offer handler can emit hangup.
        throw new Error(message);
      }
    },
    // setLocalStream / setMediaError are stable useState setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const [stream, iceServers] = await Promise.all([
            getUserMediaStream(call.hasVideo),
            fetchTurnCredentials(),
          ]);
          const pc = createPeerConnection(call.id, call.hasVideo, iceServers);
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
          const [stream, iceServers] = await Promise.all([
            getUserMediaStream(hasVideo),
            fetchTurnCredentials(),
          ]);
          const pc = createPeerConnection(data.callId, hasVideo, iceServers);
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          // Atomically snapshot-and-clear the queue so any candidate that
          // arrives during the async drain loop goes straight to addIceCandidate
          // (remoteDescription is now set) and is not affected by the clear.
          const queued = pendingCandidates.current.splice(0);
          for (const c of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }

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
          // Atomically snapshot-and-clear (same pattern as call:offer handler).
          const queued = pendingCandidates.current.splice(0);
          for (const c of queued) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
          }
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
    localStream,
    remoteStream,
    mediaError,
    clearMediaError,
    iceConnState,
    initiateCall,
    acceptCall,
    rejectCall,
    hangUp,
  };
}
