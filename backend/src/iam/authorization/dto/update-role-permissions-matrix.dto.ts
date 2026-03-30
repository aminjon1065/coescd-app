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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MatrixByRoleDto {
  @ApiProperty({ type: [String], enum: Permission, isArray: true })
  @IsArray()
  @IsEnum(Permission, { each: true })
  admin: Permission[];

  @ApiProperty({ type: [String], enum: Permission, isArray: true })
  @IsArray()
  @IsEnum(Permission, { each: true })
  manager: Permission[];

  @ApiProperty({ type: [String], enum: Permission, isArray: true })
  @IsArray()
  @IsEnum(Permission, { each: true })
  regular: Permission[];

  @ApiPropertyOptional({ type: [String], enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  chairperson?: Permission[];

  @ApiPropertyOptional({ type: [String], enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  first_deputy?: Permission[];

  @ApiPropertyOptional({ type: [String], enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  deputy?: Permission[];

  @ApiPropertyOptional({ type: [String], enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  department_head?: Permission[];

  @ApiPropertyOptional({ type: [String], enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  division_head?: Permission[];

  @ApiPropertyOptional({ type: [String], enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  chancellery?: Permission[];

  @ApiPropertyOptional({ type: [String], enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  employee?: Permission[];
}

export class UpdateRolePermissionsMatrixDto {
  @ApiProperty({ type: () => MatrixByRoleDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MatrixByRoleDto)
  rolePermissions: MatrixByRoleDto;
}
