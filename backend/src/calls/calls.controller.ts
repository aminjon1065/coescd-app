import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { CallQueryDto } from './dto/call-query.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';

@ApiTags('Calls')
@ApiBearerAuth()
@Controller('calls')
@Permissions(Permission.CALLS_READ)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  /**
   * GET /calls/turn-credentials
   * Returns short-lived HMAC-SHA1 TURN credentials for the requesting user.
   * The client should cache these for up to `ttl` seconds and re-fetch before
   * they expire.  Must be declared before `GET /calls/:id` so NestJS does not
   * match the literal string "turn-credentials" as a numeric id param.
   */
  @ApiOperation({ summary: 'Get TURN credentials for WebRTC' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get('turn-credentials')
  getTurnCredentials(@ActiveUser() user: ActiveUserData) {
    return this.callsService.getTurnCredentials(user.sub);
  }

  /**
   * GET /calls
   * Paginated call history for the current user (initiator OR receiver).
   */
  @ApiOperation({ summary: 'Get call history for the current user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get()
  async findAll(
    @ActiveUser() user: ActiveUserData,
    @Query() query: CallQueryDto,
  ) {
    return this.callsService.getHistory(
      user.sub,
      query.page ?? 1,
      query.limit ?? 20,
      query.status,
    );
  }

  /**
   * GET /calls/:id
   * Single call details — only accessible to participants.
   */
  @ApiOperation({ summary: 'Get a call by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Get(':id')
  async findOne(
    @ActiveUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const call = await this.callsService.findOne(id);
    if (!call) throw new NotFoundException(`Call #${id} not found`);
    if (!this.callsService.isParticipant(call, user.sub)) {
      throw new ForbiddenException('You are not a participant of this call');
    }
    return call;
  }
}
