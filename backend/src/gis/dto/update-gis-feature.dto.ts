import { PartialType } from '@nestjs/mapped-types';
import { CreateGisFeatureDto } from './create-gis-feature.dto';

export class UpdateGisFeatureDto extends PartialType(CreateGisFeatureDto) {}
