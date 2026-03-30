import { PartialType } from '@nestjs/swagger';
import { CreateDisasterCategoryDto } from './create-disaster-category.dto';

export class UpdateDisasterCategoryDto extends PartialType(
  CreateDisasterCategoryDto,
) {}
