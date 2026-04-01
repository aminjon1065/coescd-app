import { Body, Controller, Delete, Get, Param, Post, Patch, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { DatasetsService } from './datasets.service';

@UseGuards(AccessTokenGuard)
@Controller('analytics/datasets')
export class DatasetsController {
  constructor(private readonly svc: DatasetsService) {}

  @Get()
  findAll(@ActiveUser() user: ActiveUserData) {
    return this.svc.findAll(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: any, @ActiveUser() user: ActiveUserData) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
