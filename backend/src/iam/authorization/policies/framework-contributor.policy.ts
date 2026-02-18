import { Policy } from './interfaces/policy.interface';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ActiveUserData } from '../../interfaces/activate-user-data.interface';
import { PolicyHandler } from './interfaces/policy-handler.interface';
import { PolicyHandlersStorage } from './policy-handlers.storage';

export class FrameworkContributorPolicy implements Policy {
  name: 'FrameworkContributor';
}

@Injectable()
export class FrameworkContributorPolicyHandler
  implements PolicyHandler<FrameworkContributorPolicy>
{
  constructor(private readonly policyHandlerStorage: PolicyHandlersStorage) {
    this.policyHandlerStorage.add(FrameworkContributorPolicy, this);
  }

  async handle(
    policy: FrameworkContributorPolicy,
    user: ActiveUserData,
    context: ExecutionContext,
  ): Promise<void> {
    const isContributor = user.email.endsWith('@gmail.com');
    if (!isContributor) {
      throw new Error('User is not a Contributor');
    }
  }
}
