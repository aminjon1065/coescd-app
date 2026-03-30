import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DepartmentEnum } from '../enums/department.enum';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Main Department' })
  @IsString()
  name: string;

  @ApiProperty({ enum: DepartmentEnum })
  @IsEnum(DepartmentEnum)
  type: DepartmentEnum;

  @ApiPropertyOptional({ type: Number, description: 'Parent department ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;

  @ApiPropertyOptional({ type: Number, description: 'Chief (user) ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chiefId?: number;
}
