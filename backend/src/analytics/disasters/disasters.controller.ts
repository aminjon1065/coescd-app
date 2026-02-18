import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { DisastersService } from './disasters.service';
import { CreateDisasterDto } from './dto/create-disaster.dto';
import { UpdateDisasterDto } from './dto/update-disaster.dto';
import { GetDisastersQueryDto } from './dto/get-disasters-query.dto';

@Controller('disasters')
export class DisastersController {
  constructor(private readonly disastersService: DisastersService) {}

  @Post()
  create(@Body() dto: CreateDisasterDto) {
    return this.disastersService.create(dto);
  }

  @Get()
  findAll(@Query() query: GetDisastersQueryDto) {
    return this.disastersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disastersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDisasterDto) {
    return this.disastersService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.disastersService.remove(+id);
  }
}
