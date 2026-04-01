import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { Permission } from '../authorization/permission.type';
import { OrgUnitsService } from './org-units.service';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';

@ApiTags('Org Units')
@ApiBearerAuth()
@Controller('org-units')
export class OrgUnitsController {
  constructor(private readonly orgUnitsService: OrgUnitsService) {}

  @ApiOperation({ summary: 'Get org units list' })
  @ApiResponse({ status: 200, description: 'Returns list of org units' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions(Permission.DEPARTMENTS_READ)
  @Get()
  findAll(@Query('rootsOnly') rootsOnly?: string) {
    if (rootsOnly === 'true') {
      return this.orgUnitsService.findRoots();
    }
    return this.orgUnitsService.findAll();
  }

  @ApiOperation({ summary: 'Get org unit by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Returns the org unit' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Org unit not found' })
  @Permissions(Permission.DEPARTMENTS_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orgUnitsService.findOne(Number(id));
  }

  @ApiOperation({ summary: 'Create org unit' })
  @ApiResponse({ status: 201, description: 'Org unit created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions(Permission.DEPARTMENTS_CREATE)
  @Post()
  create(@Body() dto: CreateOrgUnitDto) {
    return this.orgUnitsService.create(dto);
  }

  @ApiOperation({ summary: 'Update org unit' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Org unit updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Org unit not found' })
  @Permissions(Permission.DEPARTMENTS_UPDATE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrgUnitDto) {
    return this.orgUnitsService.update(Number(id), dto);
  }

  @ApiOperation({ summary: 'Delete org unit' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Org unit deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Org unit not found' })
  @Permissions(Permission.DEPARTMENTS_DELETE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orgUnitsService.remove(Number(id));
  }
}
