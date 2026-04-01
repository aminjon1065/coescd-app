import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EdmV2DocumentStatus } from '../entities/edm-document.entity';

export class SearchDocumentsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(['draft', 'review', 'approval', 'signed', 'archived', 'rejected'])
  status?: EdmV2DocumentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['created_at', 'updated_at', 'title'])
  sortBy?: 'created_at' | 'updated_at' | 'title' = 'updated_at';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortDir?: 'ASC' | 'DESC' = 'DESC';
}
