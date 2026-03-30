import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { GisService } from './gis.service';
import { CreateGisLayerDto } from './dto/create-gis-layer.dto';
import { UpdateGisLayerDto } from './dto/update-gis-layer.dto';
import { CreateGisFeatureDto } from './dto/create-gis-feature.dto';
import { UpdateGisFeatureDto } from './dto/update-gis-feature.dto';
import { GetGisFeaturesQueryDto } from './dto/get-gis-features-query.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';

@ApiTags('GIS')
@ApiBearerAuth()
@Controller('gis')
export class GisController {
  constructor(private readonly gisService: GisService) {}

  // ─── Layers ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get all GIS layers' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get('layers')
  @Permissions(Permission.GIS_READ)
  findAllLayers(@ActiveUser() user: ActiveUserData) {
    return this.gisService.findAllLayers(user);
  }

  @ApiOperation({ summary: 'Create a new GIS layer' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('layers')
  @Permissions(Permission.GIS_WRITE)
  createLayer(
    @Body() dto: CreateGisLayerDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.createLayer(dto, user);
  }

  @ApiOperation({ summary: 'Update a GIS layer by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Patch('layers/:id')
  @Permissions(Permission.GIS_WRITE)
  updateLayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGisLayerDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.updateLayer(id, dto, user);
  }

  @ApiOperation({ summary: 'Delete a GIS layer by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'No content' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Delete('layers/:id')
  @Permissions(Permission.GIS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLayer(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.removeLayer(id, user);
  }

  // ─── Features ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get all GIS features' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get('features')
  @Permissions(Permission.GIS_READ)
  findAllFeatures(@Query() query: GetGisFeaturesQueryDto) {
    return this.gisService.findAllFeatures(query);
  }

  @ApiOperation({ summary: 'Get a GIS feature by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Get('features/:id')
  @Permissions(Permission.GIS_READ)
  findOneFeature(@Param('id', ParseIntPipe) id: number) {
    return this.gisService.findOneFeature(id);
  }

  @ApiOperation({ summary: 'Create a new GIS feature' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('features')
  @Permissions(Permission.GIS_WRITE)
  createFeature(
    @Body() dto: CreateGisFeatureDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.createFeature(dto, user);
  }

  @ApiOperation({ summary: 'Update a GIS feature by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Patch('features/:id')
  @Permissions(Permission.GIS_WRITE)
  updateFeature(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGisFeatureDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.updateFeature(id, dto, user);
  }

  @ApiOperation({ summary: 'Delete a GIS feature by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'No content' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Delete('features/:id')
  @Permissions(Permission.GIS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFeature(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.removeFeature(id, user);
  }
}
