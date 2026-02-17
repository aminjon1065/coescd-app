import { IUser } from './IUser';

export type TaskStatus = 'new' | 'in_progress' | 'completed';

export interface ITask {
  id: number;
  title: string;
  description: string;
  creator: IUser;
  receiver: IUser;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}
