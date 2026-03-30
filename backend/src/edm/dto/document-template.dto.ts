import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const documentTypes = [
  'incoming',
  'outgoing',
  'internal',
  'order',
  'resolution',
] as const;
const scopeTypes = ['department', 'global'] as const;
const fieldKeys = [
  'title',
  'subject',
  'summary',
  'resolutionText',
  'dueAt',
  'confidentiality',
  'type',
] as const;

export class DocumentTemplateFieldDto {
  @ApiProperty({ enum: ['title', 'subject', 'summary', 'resolutionText', 'dueAt', 'confidentiality', 'type'] })
  @IsIn(fieldKeys)
  fieldKey: (typeof fieldKeys)[number];

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fieldType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReadonly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  validationRules?: Record<string, unknown>;
}

export class CreateDocumentTemplateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['incoming', 'outgoing', 'internal', 'order', 'resolution'] })
  @IsIn(documentTypes)
  documentType: (typeof documentTypes)[number];

  @ApiProperty({ enum: ['department', 'global'] })
  @IsIn(scopeTypes)
  scopeType: (typeof scopeTypes)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ isArray: true, type: () => DocumentTemplateFieldDto })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentTemplateFieldDto)
  fields: DocumentTemplateFieldDto[];
}

export class UpdateDocumentTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ isArray: true, type: () => DocumentTemplateFieldDto })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentTemplateFieldDto)
  fields?: DocumentTemplateFieldDto[];
}

export class GetDocumentTemplatesQueryDto {
  @ApiPropertyOptional({ enum: ['incoming', 'outgoing', 'internal', 'order', 'resolution'] })
  @IsOptional()
  @IsIn(documentTypes)
  documentType?: (typeof documentTypes)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  onlyActive?: boolean;
}
