import type { PermissionType } from 'src/iam/authorization/permission.type';
import { Role } from '../../../users/enums/role.enum';
import { Department } from 'src/department/entities/department.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SafeUserDto {
  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ type: [String] })
  permissions: PermissionType[];

  @ApiPropertyOptional()
  department?: Department;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
