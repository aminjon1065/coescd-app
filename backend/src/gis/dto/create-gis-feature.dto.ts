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
} from 'class-validator';
import { Transform } from 'class-transformer';
import { GisFeatureSeverity, GisFeatureStatus } from '../entities/gis-feature.entity';

const severities: GisFeatureSeverity[] = ['low', 'medium', 'high', 'critical'];
const statuses: GisFeatureStatus[] = ['active', 'resolved', 'monitoring', 'archived'];

export class CreateGisFeatureDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  layerId?: number;

  @IsString()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsObject()
  geometry?: object;

  @IsOptional()
  @IsEnum(severities)
  severity?: GisFeatureSeverity;

  @IsOptional()
  @IsEnum(statuses)
  status?: GisFeatureStatus;

  @IsOptional()
  @IsObject()
  properties?: object;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  departmentId?: number;
}
