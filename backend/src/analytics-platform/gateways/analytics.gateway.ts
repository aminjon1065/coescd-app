import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/analytics', cors: { origin: '*', credentials: true } })
export class AnalyticsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AnalyticsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Analytics WS connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Analytics WS disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:kpi')
  handleKpiSubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: { codes: string[]; scope?: string }) {
    const scope = payload.scope ?? 'global';
    (payload.codes ?? []).forEach(code => client.join(`kpi:${code}:${scope}`));
    return { status: 'subscribed', codes: payload.codes, scope };
  }

  @SubscribeMessage('subscribe:incidents')
  handleIncidentsSubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: { geoCode?: string }) {
    const room = `incidents:${payload.geoCode ?? 'global'}`;
    client.join(room);
    return { status: 'subscribed', room };
  }

  @SubscribeMessage('unsubscribe:kpi')
  handleKpiUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: { codes: string[]; scope?: string }) {
    const scope = payload.scope ?? 'global';
    (payload.codes ?? []).forEach(code => client.leave(`kpi:${code}:${scope}`));
  }

  // Called from KpiService.snapshotAll() after saving snapshots
  broadcastKpiUpdate(code: string, scope: string, value: any) {
    this.server.to(`kpi:${code}:${scope}`).emit('kpi:update', { code, scope, value, ts: new Date() });
  }

  // Called from InternalSyncProcessor when new incidents arrive
  broadcastNewIncident(incident: any) {
    this.server.to('incidents:global').emit('incident:new', incident);
    if (incident.geoCode) {
      this.server.to(`incidents:${incident.geoCode}`).emit('incident:new', incident);
    }
  }

  broadcastPipelineStatus(pipelineId: string, status: string, stats: any) {
    this.server.emit('pipeline:status', { pipelineId, status, stats, ts: new Date() });
  }
}
