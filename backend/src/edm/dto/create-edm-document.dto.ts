import { IsIn, IsInt, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

const edmDocumentTypes = ['incoming', 'outgoing', 'internal', 'order', 'resolution'] as const;
const edmConfidentiality = ['public_internal', 'department_confidential', 'restricted'] as const;

export class CreateEdmDocumentDto {
  @IsOptional()
  @IsIn(edmDocumentTypes)
  type: (typeof edmDocumentTypes)[number];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  resolutionText?: string;

  @IsOptional()
  @IsIn(edmConfidentiality)
  confidentiality: (typeof edmConfidentiality)[number];

  @IsInt()
  departmentId: number;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsInt()
  documentTemplateId?: number;

  @IsOptional()
  templateValues?: Record<string, string>;
}
