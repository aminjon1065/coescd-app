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

const stageTypes = ['review', 'sign', 'approve'] as const;
const assigneeTypes = ['user', 'role', 'department_head'] as const;
const completionPolicies = [
  'sequential',
  'parallel_all_of',
  'parallel_any_of',
] as const;

export class SubmitEdmRouteStageDto {
  @IsInt()
  orderNo: number;

  @IsOptional()
  @IsInt()
  stageGroupNo?: number;

  @IsIn(stageTypes)
  stageType: (typeof stageTypes)[number];

  @IsIn(assigneeTypes)
  assigneeType: (typeof assigneeTypes)[number];

  @IsOptional()
  @IsInt()
  assigneeUserId?: number;

  @IsOptional()
  @IsString()
  assigneeRole?: string;

  @IsOptional()
  @IsInt()
  assigneeDepartmentId?: number;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  escalationPolicy?: Record<string, unknown>;
}

export class SubmitEdmDocumentDto {
  @IsOptional()
  @IsInt()
  routeTemplateId?: number;

  @IsOptional()
  @IsIn(completionPolicies)
  completionPolicy?: (typeof completionPolicies)[number];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitEdmRouteStageDto)
  stages?: SubmitEdmRouteStageDto[];
}

export class ExecuteEdmStageActionDto {
  @IsIn(['approved', 'rejected', 'returned_for_revision', 'commented'])
  action: 'approved' | 'rejected' | 'returned_for_revision' | 'commented';

  @IsOptional()
  @IsString()
  commentText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reasonCode?: string;
}

export class EdmOverrideDto {
  @IsIn(['force_approve', 'force_reject'])
  overrideAction: 'force_approve' | 'force_reject';

  @IsString()
  reason: string;
}
