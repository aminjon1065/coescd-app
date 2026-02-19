import {
  IsArray,
  IsDefined,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Permission } from '../permission.type';

class MatrixByRoleDto {
  @IsArray()
  @IsEnum(Permission, { each: true })
  admin: Permission[];

  @IsArray()
  @IsEnum(Permission, { each: true })
  manager: Permission[];

  @IsArray()
  @IsEnum(Permission, { each: true })
  regular: Permission[];

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  chairperson?: Permission[];

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  first_deputy?: Permission[];

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  deputy?: Permission[];

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  department_head?: Permission[];

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  division_head?: Permission[];

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  chancellery?: Permission[];

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  employee?: Permission[];
}

export class UpdateRolePermissionsMatrixDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MatrixByRoleDto)
  rolePermissions: MatrixByRoleDto;
}
