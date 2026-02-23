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
import { ChatService } from './chat.service';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';

// Roles that can write to the global room
const GLOBAL_WRITE_ROLES = new Set<Role>([
  Role.Admin,
  Role.Chairperson,
  Role.FirstDeputy,
  Role.Deputy,
]);

/** Build a canonical DM room ID — always min_max so both sides agree. */
function dmRoom(a: number, b: number): string {
  return `dm:${Math.min(a, b)}_${Math.max(a, b)}`;
}

/** Regex that accepts dept, global, and DM rooms. */
const VALID_ROOM_RE = /^(dept:\d+|global|dm:\d+_\d+)$/;

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  afterInit() {
    this.logger.log('ChatGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('No token provided');

      const payload = await this.jwtService.verifyAsync<ActiveUserData>(
        token,
        this.jwtConfiguration,
      );

      // Attach user data to socket
      client.data.user = payload;

      // Auto-join department room
      if (payload.departmentId) {
        const deptRoom = `dept:${payload.departmentId}`;
        await client.join(deptRoom);
      }
      // Everyone joins global
      await client.join('global');
      // Personal room so others can knock for DMs
      await client.join(`user:${payload.sub}`);

      this.logger.debug(
        `Client ${client.id} connected (user ${payload.sub}, dept ${payload.departmentId ?? 'none'})`,
      );
    } catch (err) {
      this.logger.warn(
        `Unauthorized WebSocket connection: ${(err as Error).message}`,
      );
      client.emit('chat:error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as ActiveUserData | undefined;
    this.logger.debug(
      `Client ${client.id} disconnected (user ${user?.sub ?? 'unknown'})`,
    );
  }

  // ── chat:message ────────────────────────────────────────────────────────────

  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; content: string },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) {
        throw new WsException('Unauthorized');
      }

      const { room, content } = data ?? {};

      if (!room || !content?.trim()) {
        throw new WsException('room and content are required');
      }

      // Validate room format
      if (!VALID_ROOM_RE.test(room)) {
        throw new WsException('Invalid room');
      }

      // Scope check
      if (room === 'global') {
        if (!GLOBAL_WRITE_ROLES.has(user.role)) {
          throw new WsException('Insufficient permissions to write to global room');
        }
      } else if (room.startsWith('dept:')) {
        // dept room — user must belong to that dept (or be admin)
        const deptId = Number(room.replace('dept:', ''));
        if (user.role !== Role.Admin && user.departmentId !== deptId) {
          throw new WsException('Cannot write to another department room');
        }
      } else if (room.startsWith('dm:')) {
        // DM room — user must be one of the two participants
        const [, idPart] = room.split(':');
        const [idA, idB] = idPart.split('_').map(Number);
        if (user.sub !== idA && user.sub !== idB) {
          throw new WsException('Cannot write to this DM room');
        }
      }

      const message = await this.chatService.saveMessage(
        user.sub,
        room,
        content.trim(),
      );

      // Serialize sender subset
      const payload = {
        id: message.id,
        room: message.room,
        sender: message.sender
          ? {
              id: message.sender.id,
              name: message.sender.name,
              avatar: message.sender.avatar,
            }
          : null,
        content: message.content,
        createdAt: message.createdAt,
      };

      this.server.to(room).emit('chat:message', payload);
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[chat] handleMessage error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── chat:history ────────────────────────────────────────────────────────────

  @SubscribeMessage('chat:history')
  async handleHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; page?: number; limit?: number },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) throw new WsException('Unauthorized');

      const { room, page = 1, limit = 50 } = data ?? {};
      if (!room || !VALID_ROOM_RE.test(room)) {
        throw new WsException('Invalid room');
      }

      const history = await this.chatService.getHistory(room, page, limit);

      client.emit('chat:history', history);
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[chat] handleHistory error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── chat:join ────────────────────────────────────────────────────────────────
  // Client emits this to explicitly join a DM (or any non-auto room) before
  // requesting history.  Validates participant eligibility for DM rooms.

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    try {
      const user = client.data.user as ActiveUserData | undefined;
      if (!user) throw new WsException('Unauthorized');

      const { room } = data ?? {};
      if (!room || !VALID_ROOM_RE.test(room)) {
        throw new WsException('Invalid room');
      }

      if (room.startsWith('dm:')) {
        const [, idPart] = room.split(':');
        const [idA, idB] = idPart.split('_').map(Number);
        if (user.sub !== idA && user.sub !== idB) {
          throw new WsException('Not a participant of this DM');
        }
      }

      await client.join(room);
      client.emit('chat:joined', { room });
    } catch (err) {
      if (err instanceof WsException) throw err;
      this.logger.error('[chat] handleJoin error:', err);
      throw new WsException('Internal server error');
    }
  }

  // ── chat:typing ─────────────────────────────────────────────────────────────

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; isTyping: boolean },
  ) {
    const user = client.data.user as ActiveUserData | undefined;
    if (!user) return;

    const { room, isTyping } = data ?? {};
    if (!room) return;

    // Broadcast to others in the room (not back to sender)
    client.to(room).emit('chat:typing', {
      userId: user.sub,
      name: user.name,
      isTyping: Boolean(isTyping),
    });
  }
}
