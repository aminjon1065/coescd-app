import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const stageTypes = ['review', 'sign', 'approve'] as const;
const assigneeTypes = ['user', 'role', 'department_head'] as const;
const completionPolicies = [
  'sequential',
  'parallel_all_of',
  'parallel_any_of',
] as const;

export class SubmitEdmRouteStageDto {
  @ApiProperty()
  @IsInt()
  orderNo: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  stageGroupNo?: number;

  @ApiProperty({ enum: ['review', 'sign', 'approve'] })
  @IsIn(stageTypes)
  stageType: (typeof stageTypes)[number];

  @ApiProperty({ enum: ['user', 'role', 'department_head'] })
  @IsIn(assigneeTypes)
  assigneeType: (typeof assigneeTypes)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  assigneeUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  assigneeDepartmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  escalationPolicy?: Record<string, unknown>;
}

export class SubmitEdmDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  routeTemplateId?: number;

  @ApiPropertyOptional({ enum: ['sequential', 'parallel_all_of', 'parallel_any_of'] })
  @IsOptional()
  @IsIn(completionPolicies)
  completionPolicy?: (typeof completionPolicies)[number];

  @ApiPropertyOptional({ isArray: true, type: () => SubmitEdmRouteStageDto })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitEdmRouteStageDto)
  stages?: SubmitEdmRouteStageDto[];
}

export class ExecuteEdmStageActionDto {
  @ApiProperty({ enum: ['approved', 'rejected', 'returned_for_revision', 'commented'] })
  @IsIn(['approved', 'rejected', 'returned_for_revision', 'commented'])
  action: 'approved' | 'rejected' | 'returned_for_revision' | 'commented';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reasonCode?: string;
}

export class EdmOverrideDto {
  @ApiProperty({ enum: ['force_approve', 'force_reject'] })
  @IsIn(['force_approve', 'force_reject'])
  overrideAction: 'force_approve' | 'force_reject';

  @ApiProperty()
  @IsString()
  reason: string;
}
