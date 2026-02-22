import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  REQUEST_DELEGATION_CONTEXT_KEY,
  REQUEST_USER_KEY,
} from '../iam.constants';
import { ActiveUserData } from '../interfaces/activate-user-data.interface';

export const ActiveUser = createParamDecorator(
  (field: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: ActiveUserData | undefined = request[REQUEST_USER_KEY];
    if (!user) {
      return undefined;
    }
    const delegationContext = request[REQUEST_DELEGATION_CONTEXT_KEY];
    const effectiveUser: ActiveUserData = delegationContext
      ? {
          ...user,
          onBehalfOfUserId: delegationContext.onBehalfOfUserId ?? null,
          actorUserId: user.actorUserId ?? user.sub,
          delegationContext,
        }
      : user;
    return field ? effectiveUser?.[field] : effectiveUser;
  },
);
