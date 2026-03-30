import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

const edmDocumentTypes = [
  'incoming',
  'outgoing',
  'internal',
  'order',
  'resolution',
] as const;
const edmDocumentStatuses = [
  'draft',
  'in_route',
  'approved',
  'rejected',
  'returned_for_revision',
  'archived',
] as const;

export class GetEdmDocumentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'in_route', 'approved', 'rejected', 'returned_for_revision', 'archived'] })
  @IsOptional()
  @IsIn(edmDocumentStatuses)
  status?: (typeof edmDocumentStatuses)[number];

  @ApiPropertyOptional({ enum: ['incoming', 'outgoing', 'internal', 'order', 'resolution'] })
  @IsOptional()
  @IsIn(edmDocumentTypes)
  type?: (typeof edmDocumentTypes)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  creatorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  documentKindId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  savedFilterId?: number;
}
