import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskType, TaskVisibility } from '../enums/task.enums';

class ChecklistItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Prepare emergency response plan' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskType, default: TaskType.Simple })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiProperty({ enum: TaskPriority, default: TaskPriority.Medium })
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @ApiPropertyOptional({ enum: TaskVisibility })
  @IsOptional()
  @IsEnum(TaskVisibility)
  visibility?: TaskVisibility;

  @ApiPropertyOptional({ example: '2025-06-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  assigneeUserId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  assigneeDepartmentId?: number;

  @ApiPropertyOptional({ example: 'department_head' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  assigneeRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  linkedDocumentId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  linkedDocumentVersion?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  linkedIncidentId?: number;

  @ApiPropertyOptional({ type: [String], example: ['urgent', 'flood'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @ApiPropertyOptional({ type: [ChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklistItems?: ChecklistItemDto[];
}
