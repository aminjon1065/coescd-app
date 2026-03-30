import api from '@/lib/axios';
import { ListResponse } from '@/lib/list-response';
import { ITask, TaskStatus } from '@/interfaces/ITask';

export interface GetTasksParams {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  creatorId?: number;
  receiverId?: number;
  departmentId?: number;
  q?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  receiverId: number;
  status?: TaskStatus;
}

export const tasksApi = {
  getTasks: (params: GetTasksParams = {}) =>
    api.get<ListResponse<ITask>>('/task', { params }).then((r) => r.data),

  getTask: (id: number) =>
    api.get<ITask>(`/task/${id}`).then((r) => r.data),

  createTask: (payload: CreateTaskPayload) =>
    api.post<ITask>('/task', payload).then((r) => r.data),

  updateTask: (id: number, payload: Partial<CreateTaskPayload> & { status?: TaskStatus }) =>
    api.patch<ITask>(`/task/${id}`, payload).then((r) => r.data),

  deleteTask: (id: number) =>
    api.delete(`/task/${id}`),

  getTaskFiles: (id: number) =>
    api.get(`/task/${id}/files`).then((r) => r.data),

  linkFileToTask: (taskId: number, fileId: number) =>
    api.post(`/task/${taskId}/files/${fileId}`).then((r) => r.data),

  unlinkFileFromTask: (taskId: number, fileId: number) =>
    api.delete(`/task/${taskId}/files/${fileId}`),
};
