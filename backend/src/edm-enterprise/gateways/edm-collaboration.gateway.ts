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
import { Inject, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../../iam/config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { DocumentsFacade } from '../../modules/documents/documents.facade';

/**
 * Real-time collaboration gateway for enterprise documents.
 *
 * Protocol:
 *   Client → collab:join       { docId }
 *   Client → collab:content    { docId, content }   (full TipTap JSON on every change)
 *   Client → collab:cursor     { docId, from, to }  (selection update)
 *   Client → collab:presence   { docId, status }    (viewing|editing)
 *
 *   Server → collab:init       { content, version, presence }
 *   Server → collab:content    { content, actorId, actorName }
 *   Server → collab:cursor     { actorId, actorName, color, from, to }
 *   Server → collab:presence   { presence: [{userId, name, color, status}] }
 *   Server → collab:error      { message }
 */

const COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];

function userColor(userId: number): string {
  return COLORS[userId % COLORS.length];
}

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway({
  namespace: '/documents',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class EdmCollaborationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EdmCollaborationGateway.name);

  /** presence: docId → Set of socket IDs */
  private presenceMap = new Map<string, Map<number, { name: string; socketId: string; status: string }>>();

  constructor(
    private readonly documentsFacade: DocumentsFacade,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  afterInit() {
    this.logger.log('EdmCollaborationGateway initialized on /documents');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('No auth token');
      const payload = await this.jwtService.verifyAsync<ActiveUserData>(token, this.jwtConfiguration);
      client.data.user = payload;
    } catch (err) {
      client.emit('collab:error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as ActiveUserData | undefined;
    if (!user) return;

    // Remove from all document presence maps
    for (const [docId, presence] of this.presenceMap.entries()) {
      if (presence.has(user.sub)) {
        presence.delete(user.sub);
        this.broadcastPresence(docId);
        if (presence.size === 0) this.presenceMap.delete(docId);
      }
    }
  }

  /* ─── Join document room ─── */
  @SubscribeMessage('collab:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { docId: string },
  ) {
    const user = client.data.user as ActiveUserData;
    const { docId } = payload;

    try {
      // Load document and latest content
      const doc = await this.documentsFacade.enterprise.findById(docId, user);
      const version = await this.documentsFacade.enterprise.getLatestVersion(docId);

      // Join socket.io room
      await client.join(`doc:${docId}`);

      // Register presence
      if (!this.presenceMap.has(docId)) this.presenceMap.set(docId, new Map());
      this.presenceMap.get(docId)!.set(user.sub, {
        name: user.name,
        socketId: client.id,
        status: 'viewing',
      });

      // Send initial state
      client.emit('collab:init', {
        content: version?.content ?? { type: 'doc', content: [] },
        version: doc.currentVersion,
        presence: this.buildPresenceList(docId, user.sub),
      });

      // Notify others
      this.broadcastPresence(docId);
    } catch (err) {
      client.emit('collab:error', { message: 'Document not found or access denied' });
    }
  }

  /* ─── Content update (broadcast to all other clients in room) ─── */
  @SubscribeMessage('collab:content')
  async handleContent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { docId: string; content: Record<string, unknown> },
  ) {
    const user = client.data.user as ActiveUserData;
    const { docId, content } = payload;

    // Update presence status to editing
    const docPresence = this.presenceMap.get(docId);
    if (docPresence?.has(user.sub)) {
      docPresence.get(user.sub)!.status = 'editing';
    }

    // Auto-save to database (fire-and-forget)
    this.documentsFacade.enterprise
      .saveContent(docId, user, content, true)
      .catch(() => {});

    // Broadcast to all OTHER clients in the room
    client.to(`doc:${docId}`).emit('collab:content', {
      content,
      actorId: user.sub,
      actorName: user.name,
      color: userColor(user.sub),
    });
  }

  /* ─── Cursor/selection update ─── */
  @SubscribeMessage('collab:cursor')
  handleCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { docId: string; from: number; to: number },
  ) {
    const user = client.data.user as ActiveUserData;
    client.to(`doc:${payload.docId}`).emit('collab:cursor', {
      actorId: user.sub,
      actorName: user.name,
      color: userColor(user.sub),
      from: payload.from,
      to: payload.to,
    });
  }

  /* ─── Presence update (viewing → editing or back) ─── */
  @SubscribeMessage('collab:presence')
  handlePresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { docId: string; status: 'viewing' | 'editing' },
  ) {
    const user = client.data.user as ActiveUserData;
    const docPresence = this.presenceMap.get(payload.docId);
    if (docPresence?.has(user.sub)) {
      docPresence.get(user.sub)!.status = payload.status;
    }
    this.broadcastPresence(payload.docId);
  }

  /* ─── Leave room ─── */
  @SubscribeMessage('collab:leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { docId: string },
  ) {
    const user = client.data.user as ActiveUserData;
    await client.leave(`doc:${payload.docId}`);
    this.presenceMap.get(payload.docId)?.delete(user.sub);
    this.broadcastPresence(payload.docId);
  }

  /* ─── Helpers ─── */
  private broadcastPresence(docId: string) {
    const list = this.buildPresenceList(docId, -1);
    this.server.to(`doc:${docId}`).emit('collab:presence', { presence: list });
  }

  private buildPresenceList(docId: string, excludeUserId: number) {
    const docPresence = this.presenceMap.get(docId);
    if (!docPresence) return [];
    return Array.from(docPresence.entries())
      .filter(([uid]) => uid !== excludeUserId)
      .map(([uid, info]) => ({
        userId: uid,
        name: info.name,
        color: userColor(uid),
        status: info.status,
      }));
  }
}
