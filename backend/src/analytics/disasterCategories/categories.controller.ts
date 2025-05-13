import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { CreateDisasterCategoryDto } from './dto/create-disaster-category.dto';
import { UpdateDisasterCategoryDto } from './dto/update-disaster-category.dto';
import { CategoriesService } from './categories.service';

@Controller('disasterCategories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Post()
  create(@Body() dto: CreateDisasterCategoryDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateDisasterCategoryDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
