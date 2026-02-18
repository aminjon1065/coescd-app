import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DepartmentEnum } from '../enums/department.enum';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DepartmentEnum)
  type?: DepartmentEnum;

  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @IsInt()
  chiefId?: number | null;
}
