import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { Type } from 'class-transformer';

const documentTypes = ['incoming', 'outgoing', 'internal'] as const;
const documentStatuses = ['draft', 'sent', 'received', 'archived'] as const;

type DocumentType = (typeof documentTypes)[number];
type DocumentStatus = (typeof documentStatuses)[number];

export class GetDocumentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['incoming', 'outgoing', 'internal'] })
  @IsOptional()
  @IsIn(documentTypes)
  type?: DocumentType;

  @ApiPropertyOptional({ enum: ['draft', 'sent', 'received', 'archived'] })
  @IsOptional()
  @IsIn(documentStatuses)
  status?: DocumentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orgUnitId?: number;
}
