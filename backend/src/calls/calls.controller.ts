import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallQueryDto } from './dto/call-query.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';

@Controller('calls')
@Permissions(Permission.CALLS_READ)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  /**
   * GET /calls
   * Paginated call history for the current user (initiator OR receiver).
   */
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
