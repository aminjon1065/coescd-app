import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus, TaskType } from '../enums/task.enums';

export class GetTasksQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TaskStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: TaskStatus[];

  @ApiPropertyOptional({ enum: TaskPriority, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskPriority, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  priority?: TaskPriority[];

  @ApiPropertyOptional({ enum: TaskType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  type?: TaskType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assigneeUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isOverdue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isSlaBreached?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  linkedDocumentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  linkedIncidentId?: number;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
