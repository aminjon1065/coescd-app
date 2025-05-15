import { DepartmentEnum } from '@/enums/DepartmentEnum';
import { IUser } from '@/interfaces/IUser';

export interface IDepartment {
  id: number;
  name: string;
  type: DepartmentEnum;
  parent: IDepartment | null;
  children: IDepartment[];
  chief: IUser | null;
  users: IUser[];
  createdAt: string | null;
  updatedAt: string | null;
}