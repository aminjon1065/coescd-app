export type CallStatus = 'pending' | 'active' | 'missed' | 'rejected' | 'ended';

export interface ICallUser {
  id: number;
  name: string;
  avatar: string | null;
}

export interface ICall {
  id: number;
  initiator: ICallUser | null;
  receiver: ICallUser | null;
  status: CallStatus;
  hasVideo: boolean;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  createdAt: string;
}
