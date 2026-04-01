import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CreateDisasterTypeDto } from './dto/create-disaster-type.dto';
import { UpdateDisasterTypeDto } from './dto/update-disaster-type.dto';
import { TypesService } from './types.service';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';

@ApiTags('Disaster Types')
@ApiBearerAuth()
@Roles(Role.Admin, Role.Analyst)
@Controller('types')
export class TypesController {
  constructor(private readonly service: TypesService) {}

  @Post()
  @Permissions(Permission.ANALYTICS_WRITE)
  @ApiOperation({ summary: 'Create a new disaster type' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateDisasterTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  @Permissions(Permission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Retrieve all disaster types' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions(Permission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Retrieve a single disaster type by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @Permissions(Permission.ANALYTICS_WRITE)
  @ApiOperation({ summary: 'Update a disaster type by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(@Param('id') id: string, @Body() dto: UpdateDisasterTypeDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.ANALYTICS_WRITE)
  @ApiOperation({ summary: 'Delete a disaster type by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
