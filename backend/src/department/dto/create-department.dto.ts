import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DepartmentEnum } from '../enums/department.enum';
import { Type } from 'class-transformer';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsEnum(DepartmentEnum)
  type: DepartmentEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chiefId?: number;
}
