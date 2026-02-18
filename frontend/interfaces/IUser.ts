import { Role } from '@/enums/RoleEnum';
import { IDepartment } from './IDepartment';

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
  department?: IDepartment | null;
  createdAt: string;
  updatedAt: string;
}
