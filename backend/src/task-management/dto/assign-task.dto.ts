import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignTaskDto {
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
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  responseDeadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
