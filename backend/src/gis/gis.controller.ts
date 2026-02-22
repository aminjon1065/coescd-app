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
import { GisService } from './gis.service';
import { CreateGisLayerDto } from './dto/create-gis-layer.dto';
import { UpdateGisLayerDto } from './dto/update-gis-layer.dto';
import { CreateGisFeatureDto } from './dto/create-gis-feature.dto';
import { UpdateGisFeatureDto } from './dto/update-gis-feature.dto';
import { GetGisFeaturesQueryDto } from './dto/get-gis-features-query.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';

@Controller('gis')
export class GisController {
  constructor(private readonly gisService: GisService) {}

  // ─── Layers ──────────────────────────────────────────────────────────────

  @Get('layers')
  @Permissions(Permission.GIS_READ)
  findAllLayers(@ActiveUser() user: ActiveUserData) {
    return this.gisService.findAllLayers(user);
  }

  @Post('layers')
  @Permissions(Permission.GIS_WRITE)
  createLayer(
    @Body() dto: CreateGisLayerDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.createLayer(dto, user);
  }

  @Patch('layers/:id')
  @Permissions(Permission.GIS_WRITE)
  updateLayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGisLayerDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.updateLayer(id, dto, user);
  }

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

  @Get('features')
  @Permissions(Permission.GIS_READ)
  findAllFeatures(@Query() query: GetGisFeaturesQueryDto) {
    return this.gisService.findAllFeatures(query);
  }

  @Get('features/:id')
  @Permissions(Permission.GIS_READ)
  findOneFeature(@Param('id', ParseIntPipe) id: number) {
    return this.gisService.findOneFeature(id);
  }

  @Post('features')
  @Permissions(Permission.GIS_WRITE)
  createFeature(
    @Body() dto: CreateGisFeatureDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.createFeature(dto, user);
  }

  @Patch('features/:id')
  @Permissions(Permission.GIS_WRITE)
  updateFeature(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGisFeatureDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.gisService.updateFeature(id, dto, user);
  }

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
