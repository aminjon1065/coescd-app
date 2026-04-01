import { Role } from '@/enums/RoleEnum';
import { IDepartment } from './IDepartment';
import { IOrgUnit } from './IOrgUnit';

export interface IUser {
  id: number;
  email: string;
  name: string;
  avatar?: string | null;
  position?: string | null;
  isVerified: boolean;
  isActive: boolean;
  role: Role;
  permissions: string[];
  businessRole?: string | null;
  department?: IDepartment | null;
  orgUnit?: IOrgUnit | null;
  createdAt: string;
  updatedAt: string;
}
