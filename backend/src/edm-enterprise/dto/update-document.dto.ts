import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalRef?: string | null;
}
