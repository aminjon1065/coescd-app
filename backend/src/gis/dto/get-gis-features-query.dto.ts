import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { GisFeatureSeverity, GisFeatureStatus } from '../entities/gis-feature.entity';

const severities: GisFeatureSeverity[] = ['low', 'medium', 'high', 'critical'];
const statuses: GisFeatureStatus[] = ['active', 'resolved', 'monitoring', 'archived'];

/** Validates that a comma-separated bbox string has valid lat/lng ranges. */
function IsValidBbox(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidBbox',
      target: (object as { constructor: Function }).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const parts = value.split(',').map(Number);
          if (parts.length !== 4 || parts.some(isNaN)) return false;
          const [minLat, minLng, maxLat, maxLng] = parts;
          return (
            minLat >= -90 && maxLat <= 90 && minLat <= maxLat &&
            minLng >= -180 && maxLng <= 180 && minLng <= maxLng
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be "minLat,minLng,maxLat,maxLng" with valid lat [-90,90] and lng [-180,180] ranges`;
        },
      },
    });
  };
}

export class GetGisFeaturesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  q?: string;

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
  @Transform(({ value }) => Number(value))
  @IsNumber()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  layerId?: number;

  /**
   * Bounding box filter: "minLat,minLng,maxLat,maxLng"
   * - lat must be in [-90, 90] with minLat ≤ maxLat
   * - lng must be in [-180, 180] with minLng ≤ maxLng
   */
  @ApiPropertyOptional({ description: 'Bounding box: minLat,minLng,maxLat,maxLng' })
  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, {
    message: 'bbox must be comma-separated numbers: minLat,minLng,maxLat,maxLng',
  })
  @IsValidBbox()
  bbox?: string;
}
