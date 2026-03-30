import { IsArray, IsEnum } from 'class-validator';
import { Permission } from '../../iam/authorization/permission.type';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserPermissionsDto {
  @ApiProperty({ type: [String], enum: Permission, isArray: true })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];
}
