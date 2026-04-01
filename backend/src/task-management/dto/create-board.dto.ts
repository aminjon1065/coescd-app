import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateBoardColumnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  wipLimit?: number;
}

export class CreateBoardDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional({ enum: ['private', 'department', 'global'] })
  @IsOptional()
  @IsEnum(['private', 'department', 'global'])
  visibility?: 'private' | 'department' | 'global';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: [CreateBoardColumnDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBoardColumnDto)
  columns?: CreateBoardColumnDto[];
}

export class UpdateBoardColumnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  wipLimit?: number;
}

export class MoveTaskDto {
  @ApiProperty({ description: 'Target column ID' })
  @IsString()
  columnId: string;

  @ApiPropertyOptional({ description: 'New order index within column' })
  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class ReorderColumnsDto {
  @ApiProperty({ type: [String], description: 'Column IDs in new order' })
  @IsArray()
  @IsString({ each: true })
  columnIds: string[];
}

export class AddChecklistItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueAt?: string;
}

export class UpdateChecklistItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
