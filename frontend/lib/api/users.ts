import api from '@/lib/axios';
import { ListResponse } from '@/lib/list-response';
import { IUser } from '@/interfaces/IUser';

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  departmentId?: number;
  orgUnitId?: number;
  isActive?: boolean;
  q?: string;
  businessRole?: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role?: string;
  departmentId?: number;
  orgUnitId?: number;
  position?: string;
  businessRole?: string;
}

export const usersApi = {
  getUsers: (params: GetUsersParams = {}) =>
    api.get<ListResponse<IUser>>('/users', { params }).then((r) => r.data),

  getUser: (id: number) =>
    api.get<IUser>(`/users/${id}`).then((r) => r.data),

  createUser: (payload: CreateUserPayload) =>
    api.post<IUser>('/users', payload).then((r) => r.data),

  updateUser: (id: number, payload: Partial<CreateUserPayload> & { isActive?: boolean }) =>
    api.patch<IUser>(`/users/${id}`, payload).then((r) => r.data),

  deleteUser: (id: number) =>
    api.delete(`/users/${id}`),

  bulkImport: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/users/bulk-import', form).then((r) => r.data);
  },
};
