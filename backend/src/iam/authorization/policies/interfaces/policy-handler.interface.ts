import { Policy } from './policy.interface';
import { ActiveUserData } from '../../../interfaces/activate-user-data.interface';

export interface PolicyHandler<T extends Policy> {
  handle(policy: T, user: ActiveUserData): Promise<void>;
}
