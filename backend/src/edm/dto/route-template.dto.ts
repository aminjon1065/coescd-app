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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const scopeTypes = ['department', 'global'] as const;
const stageTypes = ['review', 'sign', 'approve'] as const;
const assigneeTypes = ['user', 'role', 'department_head'] as const;

export class RouteTemplateStageDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  orderNo: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
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
  @IsInt()
  @Min(1)
  dueInHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  escalationPolicy?: Record<string, unknown>;
}

export class CreateRouteTemplateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['department', 'global'] })
  @IsIn(scopeTypes)
  scopeType: (typeof scopeTypes)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ isArray: true, type: () => RouteTemplateStageDto })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteTemplateStageDto)
  stages: RouteTemplateStageDto[];
}

export class UpdateRouteTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ isArray: true, type: () => RouteTemplateStageDto })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteTemplateStageDto)
  stages?: RouteTemplateStageDto[];
}

export class GetRouteTemplatesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  onlyActive?: boolean;
}
