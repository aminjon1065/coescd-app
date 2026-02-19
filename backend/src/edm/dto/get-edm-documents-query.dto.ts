import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

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
  @IsOptional()
  @IsIn(edmDocumentStatuses)
  status?: (typeof edmDocumentStatuses)[number];

  @IsOptional()
  @IsIn(edmDocumentTypes)
  type?: (typeof edmDocumentTypes)[number];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  creatorId?: number;

  @IsOptional()
  @IsString()
  externalNumber?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  savedFilterId?: number;
}
