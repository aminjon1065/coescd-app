import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task.enums';

const MAX_BULK = 100;

export class BulkTaskStatusDto {
  @ApiProperty({ description: 'Task UUIDs (max 100)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkTaskAssignDto {
  @ApiProperty({ description: 'Task UUIDs (max 100)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  assigneeUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  assigneeDepartmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeRole?: string;
}

export class BulkTaskDeleteDto {
  @ApiProperty({ description: 'Task UUIDs (max 100)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK)
  @IsUUID('4', { each: true })
  ids: string[];
}
