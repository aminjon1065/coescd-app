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
import { ApiPropertyOptional } from '@nestjs/swagger';

const operationTypes = ['dry-run', 'apply'] as const;
const operationStatuses = ['completed', 'partial', 'failed'] as const;

export class GetBulkImportOperationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: operationTypes })
  @IsOptional()
  @IsIn(operationTypes)
  type?: (typeof operationTypes)[number];

  @ApiPropertyOptional({ enum: operationStatuses })
  @IsOptional()
  @IsIn(operationStatuses)
  status?: (typeof operationStatuses)[number];

  @ApiPropertyOptional({ type: Number, description: 'Filter by actor (user) ID' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  actorId?: number;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
