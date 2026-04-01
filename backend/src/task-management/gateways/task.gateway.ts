import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../../iam/config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import type { TmTask } from '../entities/tm-task.entity';
import type { TmTaskComment } from '../entities/tm-task-comment.entity';
import type { TmTaskDelegationChain } from '../entities/tm-task-delegation-chain.entity';
import type { TaskStatus } from '../enums/task.enums';

@WebSocketGateway({
  namespace: '/task-management',
  cors: {
    // Restrict to the configured frontend origin (never wildcard in production)
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      // Allow same-origin and configured CORS_ORIGIN; fall back to localhost in dev
      const allowed = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
      if (!origin || origin === allowed || process.env.NODE_ENV === 'development') {
        cb(null, true);
      } else {
        cb(new Error('WebSocket: origin not allowed'));
      }
    },
    credentials: true,
  },
})
export class TaskGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TaskGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
  ) {}

  /**
   * Verify the JWT carried in the handshake before allowing any connection.
   * Clients must pass the access token as a query param: ?token=<jwt>
   * or in the Authorization header: Bearer <jwt>
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.query?.token as string | undefined) ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new UnauthorizedException('No token provided');

      const payload = await this.jwtService.verifyAsync(token, {
        secret:   this.jwtCfg.secret,
        audience: this.jwtCfg.audience,
        issuer:   this.jwtCfg.issuer,
      });

      // Attach user payload so message handlers can read it
      (client.data as any).user = payload;

      // Auto-join the personal user room so the server can target this user
      void client.join(`user:${payload.sub}`);

      this.logger.debug(`Client connected: ${client.id} (user=${payload.sub})`);
    } catch (err) {
      this.logger.warn(`WebSocket auth failed for ${client.id}: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-task')
  handleJoinTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { taskId: string },
  ) {
    void client.join(`task:${payload.taskId}`);
    return { event: 'joined-task', data: payload.taskId };
  }

  @SubscribeMessage('leave-task')
  handleLeaveTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { taskId: string },
  ) {
    void client.leave(`task:${payload.taskId}`);
  }

  @SubscribeMessage('join-board')
  handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string },
  ) {
    void client.join(`board:${payload.boardId}`);
    return { event: 'joined-board', data: payload.boardId };
  }

  @SubscribeMessage('leave-board')
  handleLeaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string },
  ) {
    void client.leave(`board:${payload.boardId}`);
  }

  @SubscribeMessage('join-user-room')
  handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: number },
  ) {
    void client.join(`user:${payload.userId}`);
    return { event: 'joined-user-room', data: payload.userId };
  }

  // ─── Server-emitted events (called by services) ───────────────────────────

  emitTaskUpdated(taskId: string, data: Partial<TmTask>) {
    this.server.to(`task:${taskId}`).emit('task:updated', { taskId, data });
  }

  emitTaskStatusChanged(
    taskId: string,
    from: TaskStatus,
    to: TaskStatus,
    actorId: number,
    boardId?: string,
  ) {
    const payload = { taskId, from, to, actorId };
    this.server.to(`task:${taskId}`).emit('task:status-changed', payload);
    if (boardId) this.server.to(`board:${boardId}`).emit('task:status-changed', payload);
  }

  emitTaskAssigned(
    taskId: string,
    assigneeUserId: number | null,
    assignedBy: number,
    boardId?: string,
  ) {
    const payload = { taskId, assigneeUserId, assignedBy };
    this.server.to(`task:${taskId}`).emit('task:assigned', payload);
    if (assigneeUserId) this.server.to(`user:${assigneeUserId}`).emit('task:assigned', payload);
    if (boardId) this.server.to(`board:${boardId}`).emit('task:assigned', payload);
  }

  emitCommentAdded(taskId: string, comment: TmTaskComment) {
    this.server.to(`task:${taskId}`).emit('task:comment-added', { taskId, comment });
  }

  emitCommentDeleted(taskId: string, commentId: string) {
    this.server.to(`task:${taskId}`).emit('task:comment-deleted', { taskId, commentId });
  }

  emitTaskDelegated(taskId: string, chain: TmTaskDelegationChain) {
    this.server.to(`task:${taskId}`).emit('task:delegated', { taskId, chain });
  }

  emitTaskMoved(
    taskId: string,
    fromColumnId: string | null,
    toColumnId: string,
    boardId: string,
  ) {
    this.server.to(`board:${boardId}`).emit('task:moved', { taskId, fromColumnId, toColumnId });
  }

  emitBoardReordered(boardId: string, columnIds: string[]) {
    this.server.to(`board:${boardId}`).emit('board:reordered', { boardId, columnIds });
  }

  emitTaskEscalated(taskId: string, escalatedToUserId: number) {
    this.server.to(`task:${taskId}`).emit('task:escalated', { taskId, escalatedToUserId });
    this.server.to(`user:${escalatedToUserId}`).emit('task:escalated', { taskId, escalatedToUserId });
  }

  emitTaskCreated(task: Partial<TmTask>, boardId?: string) {
    if (boardId) this.server.to(`board:${boardId}`).emit('task:created', { task });
  }
}
