import { Policy } from './policy.interface';
import { ActiveUserData } from '../../../interfaces/activate-user-data.interface';
import { ExecutionContext } from '@nestjs/common';

export interface PolicyHandler<T extends Policy> {
  handle(
    policy: T,
    user: ActiveUserData,
    context: ExecutionContext,
  ): Promise<void>;
}
