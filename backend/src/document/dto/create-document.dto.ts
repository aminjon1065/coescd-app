import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: ['incoming', 'outgoing', 'internal'] })
  @IsOptional()
  @IsEnum(['incoming', 'outgoing', 'internal'])
  type?: string;

  @ApiPropertyOptional({ enum: ['draft', 'sent', 'received', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'sent', 'received', 'archived'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  receiverId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filePath?: string;
}
