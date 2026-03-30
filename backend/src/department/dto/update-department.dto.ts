import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DepartmentEnum } from '../enums/department.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Updated Department Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: DepartmentEnum })
  @IsOptional()
  @IsEnum(DepartmentEnum)
  type?: DepartmentEnum;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Parent department ID (null to unset)' })
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Chief (user) ID (null to unset)' })
  @IsOptional()
  @IsInt()
  chiefId?: number | null;
}
