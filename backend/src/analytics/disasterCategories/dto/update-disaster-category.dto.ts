import { PartialType } from '@nestjs/mapped-types';
import { CreateDisasterCategoryDto } from './create-disaster-category.dto';

export class UpdateDisasterCategoryDto extends PartialType(
  CreateDisasterCategoryDto,
) {}
