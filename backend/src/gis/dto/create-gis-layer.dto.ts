import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { GisLayerType } from '../entities/gis-layer.entity';

const layerTypes: GisLayerType[] = [
  'incident',
  'zone',
  'resource',
  'route',
  'checkpoint',
];

export class CreateGisLayerDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsEnum(layerTypes)
  type?: GisLayerType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
