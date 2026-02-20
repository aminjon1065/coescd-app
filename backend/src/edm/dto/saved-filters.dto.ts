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
  @IsOptional()
  @IsIn(edmDocumentStatuses)
  status?: (typeof edmDocumentStatuses)[number];

  @IsOptional()
  @IsIn(edmDocumentTypes)
  type?: (typeof edmDocumentTypes)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creatorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  documentKindId?: number;

  @IsOptional()
  @IsString()
  externalNumber?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}

export class CreateSavedFilterDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsIn(['documents'])
  scope?: 'documents';

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ValidateNested()
  @Type(() => SavedDocumentsCriteriaDto)
  criteria: SavedDocumentsCriteriaDto;
}

export class UpdateSavedFilterDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SavedDocumentsCriteriaDto)
  criteria?: SavedDocumentsCriteriaDto;
}

export class GetSavedFiltersQueryDto {
  @IsOptional()
  @IsIn(['documents'])
  scope?: 'documents';
}
