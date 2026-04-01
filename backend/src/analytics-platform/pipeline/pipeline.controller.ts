import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { AnlPipelineRun } from '../entities/anl-pipeline-run.entity';
import { PipelineSchedulerService } from './pipeline-scheduler.service';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';

@UseGuards(AccessTokenGuard)
@Roles(Role.Admin, Role.Analyst)
@Controller('analytics/pipeline')
export class PipelineController {
  constructor(
    @InjectRepository(AnlPipelineRun) private readonly runRepo: Repository<AnlPipelineRun>,
    private readonly scheduler: PipelineSchedulerService,
  ) {}

  @Get('runs')
  @Permissions(Permission.ANALYTICS_READ)
  getRuns(@Query('limit') limit?: string) {
    return this.runRepo.find({ order: { startedAt: 'DESC' }, take: parseInt(limit ?? '50') });
  }

  @Post('trigger')
  @Roles(Role.Admin)
  @Permissions(Permission.ANALYTICS_WRITE)
  trigger(@Body() body: { queue: string; job: string; data?: Record<string, unknown> }) {
    return this.scheduler.triggerManual(body.queue, body.job, body.data ?? {});
  }
}
