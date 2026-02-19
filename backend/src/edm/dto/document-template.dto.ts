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
  @IsIn(fieldKeys)
  fieldKey: (typeof fieldKeys)[number];

  @IsString()
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsString()
  fieldType?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isReadonly?: boolean;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @IsOptional()
  validationRules?: Record<string, unknown>;
}

export class CreateDocumentTemplateDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(documentTypes)
  documentType: (typeof documentTypes)[number];

  @IsIn(scopeTypes)
  scopeType: (typeof scopeTypes)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentTemplateFieldDto)
  fields: DocumentTemplateFieldDto[];
}

export class UpdateDocumentTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentTemplateFieldDto)
  fields?: DocumentTemplateFieldDto[];
}

export class GetDocumentTemplatesQueryDto {
  @IsOptional()
  @IsIn(documentTypes)
  documentType?: (typeof documentTypes)[number];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  onlyActive?: boolean;
}
