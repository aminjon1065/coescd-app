import { IsArray, IsDefined, IsEnum, IsObject, ValidateNested } from 'class-validator';
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
}

export class UpdateRolePermissionsMatrixDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MatrixByRoleDto)
  rolePermissions: MatrixByRoleDto;
}
