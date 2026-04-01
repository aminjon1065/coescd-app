import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { ReportsService } from './reports.service';

@UseGuards(AccessTokenGuard)
@Controller('analytics/reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get()
  findAll(@ActiveUser() user: ActiveUserData) {
    return this.svc.findAll(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  request(@Body() dto: any, @ActiveUser() user: ActiveUserData) {
    return this.svc.request(dto, user.sub);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string) {
    return this.svc.getDownloadUrl(id);
  }
}
