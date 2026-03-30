import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class SavedDocumentsCriteriaDto {
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
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creatorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
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
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}

export class CreateSavedFilterDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ enum: ['documents'] })
  @IsOptional()
  @IsIn(['documents'])
  scope?: 'documents';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ type: () => SavedDocumentsCriteriaDto })
  @ValidateNested()
  @Type(() => SavedDocumentsCriteriaDto)
  criteria: SavedDocumentsCriteriaDto;
}

export class UpdateSavedFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: () => SavedDocumentsCriteriaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SavedDocumentsCriteriaDto)
  criteria?: SavedDocumentsCriteriaDto;
}

export class GetSavedFiltersQueryDto {
  @ApiPropertyOptional({ enum: ['documents'] })
  @IsOptional()
  @IsIn(['documents'])
  scope?: 'documents';
}
