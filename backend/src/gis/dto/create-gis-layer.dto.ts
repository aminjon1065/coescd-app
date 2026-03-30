import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GisLayerType } from '../entities/gis-layer.entity';

const layerTypes: GisLayerType[] = [
  'incident',
  'zone',
  'resource',
  'route',
  'checkpoint',
];

export class CreateGisLayerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ enum: ['incident', 'zone', 'resource', 'route', 'checkpoint'] })
  @IsOptional()
  @IsEnum(layerTypes)
  type?: GisLayerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
