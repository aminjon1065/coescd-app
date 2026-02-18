import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const scopeTypes = ['department', 'global'] as const;
const stageTypes = ['review', 'sign', 'approve'] as const;
const assigneeTypes = ['user', 'role', 'department_head'] as const;

export class RouteTemplateStageDto {
  @IsInt()
  @Min(1)
  orderNo: number;

  @IsOptional()
  @IsInt()
  @Min(1)
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
  @IsInt()
  @Min(1)
  dueInHours?: number;

  @IsOptional()
  escalationPolicy?: Record<string, unknown>;
}

export class CreateRouteTemplateDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(scopeTypes)
  scopeType: (typeof scopeTypes)[number];

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteTemplateStageDto)
  stages: RouteTemplateStageDto[];
}

export class UpdateRouteTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteTemplateStageDto)
  stages?: RouteTemplateStageDto[];
}

export class GetRouteTemplatesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  onlyActive?: boolean;
}
