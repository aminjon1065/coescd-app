import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { CreateDisasterTypeDto } from './dto/create-disaster-type.dto';
import { UpdateDisasterTypeDto } from './dto/update-disaster-type.dto';
import { TypesService } from './types.service';

@Controller('types')
export class TypesController {
  constructor(private readonly service: TypesService) {}

  @Post()
  create(@Body() dto: CreateDisasterTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDisasterTypeDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
