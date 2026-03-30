import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const edmDocumentTypes = [
  'incoming',
  'outgoing',
  'internal',
  'order',
  'resolution',
] as const;
const edmConfidentiality = [
  'public_internal',
  'department_confidential',
  'restricted',
] as const;

export class UpdateEdmDocumentDto {
  @ApiPropertyOptional({ enum: ['incoming', 'outgoing', 'internal', 'order', 'resolution'] })
  @IsOptional()
  @IsIn(edmDocumentTypes)
  type?: (typeof edmDocumentTypes)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionText?: string;

  @ApiPropertyOptional({ enum: ['public_internal', 'department_confidential', 'restricted'] })
  @IsOptional()
  @IsIn(edmConfidentiality)
  confidentiality?: (typeof edmConfidentiality)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  documentKindId?: number | null;
}
