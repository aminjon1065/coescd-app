import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GisFeatureSeverity, GisFeatureStatus } from '../entities/gis-feature.entity';

const severities: GisFeatureSeverity[] = ['low', 'medium', 'high', 'critical'];
const statuses: GisFeatureStatus[] = ['active', 'resolved', 'monitoring', 'archived'];

const GEOJSON_TYPES = [
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
  'GeometryCollection',
] as const;

type GeoJsonType = (typeof GEOJSON_TYPES)[number];

/** Minimal GeoJSON geometry object — type must be a valid GeoJSON geometry type. */
export class GeoJsonGeometryDto {
  @ApiProperty({ enum: ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'] })
  @IsEnum(GEOJSON_TYPES, {
    message: `type must be one of: ${GEOJSON_TYPES.join(', ')}`,
  })
  type: GeoJsonType;

  /** Coordinates or nested geometries — accept as-is after type validation. */
  @ApiPropertyOptional()
  @IsOptional()
  coordinates?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  geometries?: unknown;
}

export class CreateGisFeatureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  layerId?: number;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty()
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  longitude: number;

  /** GeoJSON geometry — if provided, must have a valid GeoJSON type field. */
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJsonGeometryDto)
  geometry?: GeoJsonGeometryDto;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(severities)
  severity?: GisFeatureSeverity;

  @ApiPropertyOptional({ enum: ['active', 'resolved', 'monitoring', 'archived'] })
  @IsOptional()
  @IsEnum(statuses)
  status?: GisFeatureStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  properties?: object;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  departmentId?: number;
}
