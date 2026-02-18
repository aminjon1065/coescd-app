import { PermissionType } from 'src/iam/authorization/permission.type';
import { Role } from '../../../users/enums/role.enum';
import { Department } from 'src/department/entities/department.entity';

export class SafeUserDto {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  role: Role;
  permissions: PermissionType[];
  department?: Department;
  createdAt: Date;
  updatedAt: Date;
}
