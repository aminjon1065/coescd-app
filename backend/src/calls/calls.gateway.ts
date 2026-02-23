import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../iam/config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { CallsService } from './calls.service';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';

@WebSocketGateway({
  namespace: '/calls',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class CallsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallsGateway.name);

  constructor(
    private readonly callsService: CallsService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  afterInit() {
    this.logger.log('CallsGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('No token provided');

      const payload = await this.jwtService.verifyAsync<ActiveUserData>(
        token,
        this.jwtConfiguration,
      );

      client.data.user = payload;

      // Each user gets their own addressable room
      await client.join(`user:${payload.sub}`);

      this.logger.debug(
        `[calls] Client ${client.id} connected (user ${payload.sub})`,
      );
    } catch (err) {
      this.logger.warn(
        `[calls] Unauthorized connection: ${(err as Error).message}`,
      );
      client.emit('calls:error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as ActiveUserData | undefined;
    this.logger.debug(
      `[calls] Client ${client.id} disconnected (user ${user?.sub ?? 'unknown'})`,
    );
  }

  // ── call:invite ──────────────────────────────────────────────────────────────
  // Caller initiates a call to a receiver.
  @SubscribeMessage('call:invite')
  async handleInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: number; hasVideo?: boolean },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) throw new WsException('Unauthorized');

      const { receiverId, hasVideo = false } = data ?? {};
      if (!receiverId) throw new WsException('receiverId is required');
      if (receiverId === user.sub) throw new WsException('Cannot call yourself');

      const call = await this.callsService.createCall(
        user.sub,
        receiverId,
        hasVideo,
      );

      // Caller joins the call signaling room immediately
      await client.join(`call:${call.id}`);

      const callPayload = {
        id: call.id,
        initiator: call.initiator
          ? { id: call.initiator.id, name: call.initiator.name, avatar: call.initiator.avatar }
          : null,
        receiver: call.receiver
          ? { id: call.receiver.id, name: call.receiver.name, avatar: call.receiver.avatar }
          : null,
        status: call.status,
        hasVideo: call.hasVideo,
        startedAt: null,
        endedAt: null,
        durationSec: null,
        createdAt: call.createdAt,
      };

      // Notify the receiver
      this.server.to(`user:${receiverId}`).emit('call:incoming', callPayload);

      // Acknowledge to caller (so they can show "Ringing..." state)
      client.emit('call:ringing', callPayload);
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[calls] handleInvite error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── call:accept ──────────────────────────────────────────────────────────────
  // Receiver accepts the call.
  @SubscribeMessage('call:accept')
  async handleAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: number },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) throw new WsException('Unauthorized');

      const { callId } = data ?? {};
      if (!callId) throw new WsException('callId is required');

      const existing = await this.callsService.findOne(callId);
      if (!existing) throw new WsException(`Call #${callId} not found`);
      if (existing.receiver?.id !== user.sub) throw new WsException('Not the receiver');
      if (existing.status !== 'pending') throw new WsException('Call is no longer pending');

      const call = await this.callsService.updateStatus(callId, 'active', {
        startedAt: new Date(),
      });

      // Receiver joins the signaling room
      await client.join(`call:${callId}`);

      const callPayload = this.serializeCall(call);

      // Notify both parties
      this.server.to(`call:${callId}`).emit('call:accepted', callPayload);
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[calls] handleAccept error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── call:reject ──────────────────────────────────────────────────────────────
  // Receiver rejects the call.
  @SubscribeMessage('call:reject')
  async handleReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: number },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) throw new WsException('Unauthorized');

      const { callId } = data ?? {};
      if (!callId) throw new WsException('callId is required');

      const existing = await this.callsService.findOne(callId);
      if (!existing) throw new WsException(`Call #${callId} not found`);
      if (existing.receiver?.id !== user.sub) throw new WsException('Not the receiver');
      if (existing.status !== 'pending') throw new WsException('Call is no longer pending');

      const call = await this.callsService.updateStatus(callId, 'rejected');
      const callPayload = this.serializeCall(call);

      // Notify the initiator
      if (existing.initiator) {
        this.server.to(`user:${existing.initiator.id}`).emit('call:rejected', callPayload);
      }
      client.emit('call:rejected', callPayload);
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[calls] handleReject error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── call:hangup ──────────────────────────────────────────────────────────────
  // Either party hangs up an active or pending call.
  @SubscribeMessage('call:hangup')
  async handleHangup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: number },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) throw new WsException('Unauthorized');

      const { callId } = data ?? {};
      if (!callId) throw new WsException('callId is required');

      const existing = await this.callsService.findOne(callId);
      if (!existing) throw new WsException(`Call #${callId} not found`);
      if (!this.callsService.isParticipant(existing, user.sub)) {
        throw new WsException('Not a participant');
      }
      if (existing.status === 'ended' || existing.status === 'rejected') {
        return; // already done
      }

      const endedAt = new Date();
      const durationSec =
        existing.startedAt
          ? this.callsService.computeDuration(existing.startedAt)
          : null;

      // Pending → missed (the other party hung up before answer)
      const newStatus: 'ended' | 'missed' =
        existing.status === 'pending' ? 'missed' : 'ended';

      const call = await this.callsService.updateStatus(callId, newStatus, {
        endedAt,
        durationSec: durationSec ?? undefined,
      });

      const callPayload = this.serializeCall(call);
      this.server.to(`call:${callId}`).emit('call:ended', callPayload);
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[calls] handleHangup error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── call:offer ───────────────────────────────────────────────────────────────
  // Relay WebRTC SDP offer to the other participant.
  @SubscribeMessage('call:offer')
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: number; sdp: RTCSessionDescriptionInit },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) throw new WsException('Unauthorized');
      await this.validateParticipant(data?.callId, user.sub);
      // Relay to other participant, exclude sender
      client.to(`call:${data.callId}`).emit('call:offer', {
        callId: data.callId,
        sdp: data.sdp,
      });
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[calls] handleOffer error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── call:answer ──────────────────────────────────────────────────────────────
  // Relay WebRTC SDP answer to the other participant.
  @SubscribeMessage('call:answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: number; sdp: RTCSessionDescriptionInit },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) throw new WsException('Unauthorized');
      await this.validateParticipant(data?.callId, user.sub);
      client.to(`call:${data.callId}`).emit('call:answer', {
        callId: data.callId,
        sdp: data.sdp,
      });
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[calls] handleAnswer error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── call:ice-candidate ───────────────────────────────────────────────────────
  // Relay ICE candidate to the other participant.
  @SubscribeMessage('call:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: number; candidate: RTCIceCandidateInit },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) throw new WsException('Unauthorized');
      await this.validateParticipant(data?.callId, user.sub);
      client.to(`call:${data.callId}`).emit('call:ice-candidate', {
        callId: data.callId,
        candidate: data.candidate,
      });
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[calls] handleIceCandidate error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  private async validateParticipant(
    callId: number,
    userId: number,
  ): Promise<void> {
    if (!callId) throw new WsException('callId is required');
    const call = await this.callsService.findOne(callId);
    if (!call) throw new WsException(`Call #${callId} not found`);
    if (!this.callsService.isParticipant(call, userId)) {
      throw new WsException('Not a participant');
    }
  }

  private serializeCall(call: {
    id: number;
    initiator: { id: number; name: string; avatar: string | null } | null;
    receiver: { id: number; name: string; avatar: string | null } | null;
    status: string;
    hasVideo: boolean;
    startedAt: Date | null;
    endedAt: Date | null;
    durationSec: number | null;
    createdAt: Date;
  }) {
    return {
      id: call.id,
      initiator: call.initiator
        ? { id: call.initiator.id, name: call.initiator.name, avatar: call.initiator.avatar }
        : null,
      receiver: call.receiver
        ? { id: call.receiver.id, name: call.receiver.name, avatar: call.receiver.avatar }
        : null,
      status: call.status,
      hasVideo: call.hasVideo,
      startedAt: call.startedAt ?? null,
      endedAt: call.endedAt ?? null,
      durationSec: call.durationSec ?? null,
      createdAt: call.createdAt,
    };
  }
}
