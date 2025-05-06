import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DepartmentEnum } from '../enums/department.enum';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsEnum(DepartmentEnum)
  type: DepartmentEnum;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  chiefId?: number;
}
