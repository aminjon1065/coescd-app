import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

const operationTypes = ['dry-run', 'apply'] as const;
const operationStatuses = ['completed', 'partial', 'failed'] as const;

export class GetBulkImportOperationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(operationTypes)
  type?: (typeof operationTypes)[number];

  @IsOptional()
  @IsIn(operationStatuses)
  status?: (typeof operationStatuses)[number];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  actorId?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
