import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * List notifications for the current user.
   * ?unread=true  — return only unread notifications
   */
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  list(
    @ActiveUser() actor: ActiveUserData,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('unread') unread?: string,
  ) {
    return this.notificationsService.listForUser(
      actor.sub,
      page,
      limit,
      unread === 'true',
    );
  }

  /** Count of unread notifications. */
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('unread-count')
  unreadCount(@ActiveUser() actor: ActiveUserData) {
    return this.notificationsService
      .countUnread(actor.sub)
      .then((count) => ({ count }));
  }

  /** Mark a single notification as read. */
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch(':id/read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.notificationsService.markRead(id, actor.sub);
  }

  /** Mark all notifications as read. */
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('read-all')
  markAllRead(@ActiveUser() actor: ActiveUserData) {
    return this.notificationsService
      .markAllRead(actor.sub)
      .then(() => ({ success: true }));
  }
}
