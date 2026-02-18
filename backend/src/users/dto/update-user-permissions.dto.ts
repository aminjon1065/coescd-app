import { IsArray, IsEnum } from 'class-validator';
import { Permission } from '../../iam/authorization/permission.type';

export class UpdateUserPermissionsDto {
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];
}
