import { PartialType } from '@nestjs/mapped-types';
import { CreateGisLayerDto } from './create-gis-layer.dto';

export class UpdateGisLayerDto extends PartialType(CreateGisLayerDto) {}
