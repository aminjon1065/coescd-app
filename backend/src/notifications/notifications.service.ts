import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification, NotificationKind } from './entities/notification.entity';
import { PaginatedResponse } from '../common/http/pagination-query.dto';
import { EdmEvents, EdmStageActionExecutedEvent } from '../edm/events/edm-events';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  async createForUser(
    userId: number,
    kind: NotificationKind,
    message: string,
    payload?: Record<string, unknown>,
  ): Promise<Notification> {
    const notification = this.notificationRepo.create({
      user: { id: userId } as any,
      kind,
      message,
      payload: payload ?? null,
    });
    return this.notificationRepo.save(notification);
  }

  async listForUser(
    userId: number,
    page = 1,
    limit = 30,
    onlyUnread = false,
  ): Promise<PaginatedResponse<Notification>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC')
      .skip(offset)
      .take(safeLimit);

    if (onlyUnread) {
      qb.andWhere('n.read_at IS NULL');
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: safePage, limit: safeLimit };
  }

  async markRead(notificationId: number, userId: number): Promise<Notification | null> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, user: { id: userId } },
    });
    if (!notification || notification.readAt) return notification;

    notification.readAt = new Date();
    return this.notificationRepo.save(notification);
  }

  async markAllRead(userId: number): Promise<void> {
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();
  }

  async countUnread(userId: number): Promise<number> {
    return this.notificationRepo.count({
      where: { user: { id: userId }, readAt: undefined as any },
    });
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  @OnEvent(EdmEvents.STAGE_ACTION_EXECUTED)
  async onStageActionExecuted(event: EdmStageActionExecutedEvent): Promise<void> {
    // Notify the document creator when their document is acted upon
    // (In a full implementation we'd look up the assigneeUserId from the stage)
    await this.createForUser(
      event.actorId,
      'document_routed',
      `Document #${event.documentId} route action: ${event.action}`,
      {
        documentId: event.documentId,
        routeId: event.routeId,
        stageId: event.stageId,
        action: event.action,
      },
    );
  }
}
