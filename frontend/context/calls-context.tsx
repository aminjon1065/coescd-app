'use client';

import { createContext, useContext } from 'react';
import { useAuth } from '@/context/auth-context';
import { useCallsSocket, UseCallsSocketReturn } from '@/hooks/useCallsSocket';
import { IncomingCallOverlay } from '@/components/calls/incoming-call-overlay';
import { ActiveCallDialog } from '@/components/calls/active-call-dialog';

// Provide a safe default so the context is never undefined
const defaultValue: UseCallsSocketReturn = {
  connected: false,
  incomingCall: null,
  activeCall: null,
  localStreamRef: { current: null },
  remoteStreamRef: { current: null },
  initiateCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  hangUp: () => {},
};

const CallsContext = createContext<UseCallsSocketReturn>(defaultValue);

export function CallsProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const calls = useCallsSocket(accessToken);

  return (
    <CallsContext.Provider value={calls}>
      {children}
      <IncomingCallOverlay />
      <ActiveCallDialog />
    </CallsContext.Provider>
  );
}

export function useCalls(): UseCallsSocketReturn {
  return useContext(CallsContext);
}
