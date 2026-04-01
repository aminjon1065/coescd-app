import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { GeoService } from './geo.service';
import { TileService } from './tile.service';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';

@UseGuards(AccessTokenGuard)
@Roles(Role.Admin, Role.Analyst)
@Controller('analytics/geo')
export class GeoController {
  constructor(
    private readonly geo: GeoService,
    private readonly tiles: TileService,
  ) {}

  @Get('boundaries')
  @Permissions(Permission.ANALYTICS_READ)
  getBoundaries(@Query('level') level?: string) {
    return this.geo.getBoundaries(level);
  }

  @Get('risk-zones')
  @Permissions(Permission.ANALYTICS_READ)
  getRiskZones(@Query('type') type?: string, @Query('severity_min') sevMin?: string) {
    return this.geo.getRiskZones(type, sevMin ? parseInt(sevMin) : 1);
  }

  @Get('infrastructure')
  @Permissions(Permission.ANALYTICS_READ)
  getInfrastructure(@Query('type') type?: string) {
    return this.geo.getInfrastructure(type);
  }

  @Get('incidents/active')
  @Permissions(Permission.ANALYTICS_READ)
  getActiveIncidents() {
    return this.geo.getActiveIncidents();
  }

  @Get('incidents/density')
  @Permissions(Permission.ANALYTICS_READ)
  getIncidentDensity(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('severity_min') sevMin?: string,
  ) {
    return this.geo.getIncidentDensity(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      sevMin ? parseInt(sevMin) : 1,
    );
  }

  @Get('incidents/trend')
  @Permissions(Permission.ANALYTICS_READ)
  getIncidentTrend(
    @Query('days') days?: string,
    @Query('group_by') groupBy?: string,
    @Query('geo_code') geoCode?: string,
  ) {
    return this.geo.getIncidentTrend(
      days ? parseInt(days) : 30,
      (groupBy as 'day' | 'week' | 'month') ?? 'day',
      geoCode,
    );
  }

  @Get('incidents/playback')
  @Permissions(Permission.ANALYTICS_READ)
  getPlayback(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('resolution') resolution?: string,
  ) {
    return this.geo.getPlaybackData(
      new Date(from ?? Date.now() - 30 * 86400000),
      new Date(to ?? Date.now()),
      (resolution as 'hour' | 'day') ?? 'day',
    );
  }

  @Get('incidents')
  @Permissions(Permission.ANALYTICS_READ)
  queryIncidents(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('geo_code') geoCode?: string,
    @Query('type_id') typeId?: string,
    @Query('severity_min') sevMin?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.geo.queryIncidents({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      geoCode,
      incidentTypeId: typeId ? parseInt(typeId) : undefined,
      severityMin: sevMin ? parseInt(sevMin) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Post('spatial-query')
  @Permissions(Permission.ANALYTICS_READ)
  spatialQuery(@Body() body: { type: 'buffer' | 'nearest' | 'intersection'; params: Record<string, unknown> }) {
    return this.geo.spatialQuery(body.type, body.params);
  }

  // MVT tile endpoints (no auth — tiles can be public CDN-cached)
  @Get('tiles/boundaries/:z/:x/:y.mvt')
  @Permissions(Permission.ANALYTICS_READ)
  async getBoundaryTile(
    @Param('z', ParseIntPipe) z: number,
    @Param('x', ParseIntPipe) x: number,
    @Param('y', ParseIntPipe) y: number,
    @Res() res: Response,
  ) {
    const tile = await this.tiles.getBoundaryTile(z, x, y);
    res.setHeader('Content-Type', 'application/x-protobuf');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(tile ?? Buffer.alloc(0));
  }

  @Get('tiles/risk-zones/:z/:x/:y.mvt')
  @Permissions(Permission.ANALYTICS_READ)
  async getRiskZoneTile(
    @Param('z', ParseIntPipe) z: number,
    @Param('x', ParseIntPipe) x: number,
    @Param('y', ParseIntPipe) y: number,
    @Res() res: Response,
  ) {
    const tile = await this.tiles.getRiskZoneTile(z, x, y);
    res.setHeader('Content-Type', 'application/x-protobuf');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(tile ?? Buffer.alloc(0));
  }
}
