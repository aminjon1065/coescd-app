import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { GisFeatureSeverity, GisFeatureStatus } from '../entities/gis-feature.entity';

const severities: GisFeatureSeverity[] = ['low', 'medium', 'high', 'critical'];
const statuses: GisFeatureStatus[] = ['active', 'resolved', 'monitoring', 'archived'];

export class GetGisFeaturesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  q?: string;

  @IsOptional()
  @IsEnum(severities)
  severity?: GisFeatureSeverity;

  @IsOptional()
  @IsEnum(statuses)
  status?: GisFeatureStatus;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  layerId?: number;

  /** Bounding box: minLat,minLng,maxLat,maxLng (comma-separated) */
  @IsOptional()
  @IsString()
  bbox?: string;
}
