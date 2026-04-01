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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DisastersService } from './disasters.service';
import { CreateDisasterDto } from './dto/create-disaster.dto';
import { UpdateDisasterDto } from './dto/update-disaster.dto';
import { GetDisastersQueryDto } from './dto/get-disasters-query.dto';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';

@ApiTags('Disasters')
@ApiBearerAuth()
@Roles(Role.Admin, Role.Analyst)
@Controller('disasters')
export class DisastersController {
  constructor(private readonly disastersService: DisastersService) {}

  @Post()
  @Permissions(Permission.ANALYTICS_WRITE)
  @ApiOperation({ summary: 'Create a new disaster record' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateDisasterDto) {
    return this.disastersService.create(dto);
  }

  @Get()
  @Permissions(Permission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Retrieve all disasters with optional filters' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: GetDisastersQueryDto) {
    return this.disastersService.findAll(query);
  }

  @Get(':id')
  @Permissions(Permission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Retrieve a single disaster by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.disastersService.findOne(+id);
  }

  @Patch(':id')
  @Permissions(Permission.ANALYTICS_WRITE)
  @ApiOperation({ summary: 'Update a disaster by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(@Param('id') id: string, @Body() dto: UpdateDisasterDto) {
    return this.disastersService.update(+id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.ANALYTICS_WRITE)
  @ApiOperation({ summary: 'Delete a disaster by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.disastersService.remove(+id);
  }
}
