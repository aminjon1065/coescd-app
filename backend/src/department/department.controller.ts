import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';

@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Permissions(Permission.DEPARTMENTS_CREATE)
  @Post()
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.create(createDepartmentDto);
  }

  @Permissions(Permission.DEPARTMENTS_READ)
  @Get()
  findAll() {
    return this.departmentService.findAll();
  }

  @Permissions(Permission.DEPARTMENTS_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(+id);
  }

  @Permissions(Permission.DEPARTMENTS_UPDATE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(+id, updateDepartmentDto);
  }

  @Permissions(Permission.DEPARTMENTS_DELETE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentService.remove(+id);
  }
}
