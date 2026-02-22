import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { ActiveUserData } from '../interfaces/activate-user-data.interface';
import { IamDelegation } from '../../edm/entities/iam-delegation.entity';
import { ScopeResolverService } from '../authorization/scope-resolver.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class DelegationContextService {
  constructor(
    @InjectRepository(IamDelegation)
    private readonly delegationRepository: Repository<IamDelegation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly scopeResolver: ScopeResolverService,
  ) {}

  async applyDelegationToRequest(
    request: Request,
    actor: ActiveUserData,
  ): Promise<ActiveUserData> {
    const intent = (request as any).delegationIntent as
      | { delegationId: number; onBehalfOfUserId?: number | null }
      | undefined;
    if (!intent) {
      return actor;
    }

    if (actor.delegationContext?.delegationId || actor.onBehalfOfUserId) {
      throw new ForbiddenException('Nested delegation is not allowed');
    }

    const delegation = await this.delegationRepository.findOne({
      where: { id: intent.delegationId },
      relations: {
        delegateUser: true,
        delegatorUser: { department: true, orgUnit: true },
        scopeDepartment: true,
        scopeOrgUnit: true,
      },
    });
    if (!delegation) {
      throw new ForbiddenException('Delegation not found');
    }

    const now = new Date();
    if (delegation.status !== 'active' || delegation.validFrom > now || delegation.validTo < now) {
      throw new ForbiddenException('Delegation is not active');
    }
    if (delegation.delegateUser?.id !== actor.sub) {
      throw new ForbiddenException('Delegation does not belong to current actor');
    }
    if (delegation.delegatorUser?.id === actor.sub) {
      throw new ForbiddenException('Nested delegation is not allowed');
    }
    if (
      intent.onBehalfOfUserId !== undefined &&
      intent.onBehalfOfUserId !== null &&
      intent.onBehalfOfUserId !== delegation.delegatorUser?.id
    ) {
      throw new ForbiddenException(
        'on-behalf-of user must match the delegator on the delegation record',
      );
    }

    const delegator = await this.userRepository.findOne({
      where: { id: delegation.delegatorUser.id },
      relations: { department: true, orgUnit: true },
    });
    if (!delegator) {
      throw new ForbiddenException('Delegator not found');
    }

    const delegatorScope = await this.scopeResolver.resolveScope({
      sub: delegator.id,
      email: delegator.email,
      name: delegator.name,
      role: delegator.role,
      departmentId: delegator.department?.id ?? null,
      businessRole: delegator.businessRole ?? null,
      orgUnitId: delegator.orgUnit?.id ?? null,
      orgUnitPath: delegator.orgUnit?.path ?? null,
      permissions: [],
    });

    if (!this.scopeResolver.isDelegationWithinScope(delegatorScope, delegation)) {
      throw new ForbiddenException('Delegation expands scope beyond delegator');
    }

    const nextActor: ActiveUserData = {
      ...actor,
      delegationContext: {
        delegationId: delegation.id,
        scopeType: delegation.scopeType,
        scopeDepartmentId: delegation.scopeDepartment?.id ?? null,
        scopeOrgUnitId: delegation.scopeOrgUnit?.id ?? null,
        onBehalfOfUserId: intent.onBehalfOfUserId ?? delegation.delegatorUser.id,
        delegatorUserId: delegation.delegatorUser.id,
        delegateUserId: delegation.delegateUser.id,
        isGlobal: delegation.scopeType === 'global',
        allowedDepartmentIds: delegation.scopeDepartment?.id
          ? [delegation.scopeDepartment.id]
          : [],
        allowedOrgUnitIds: delegation.scopeOrgUnit?.id
          ? [delegation.scopeOrgUnit.id]
          : [],
        allowedOrgPathPrefixes: delegation.scopeOrgUnit?.path
          ? [delegation.scopeOrgUnit.path]
          : [],
        permissionSubset: delegation.permissionSubset ?? [],
        validatedAt: new Date().toISOString(),
      },
      actorUserId: actor.sub,
      onBehalfOfUserId: intent.onBehalfOfUserId ?? delegation.delegatorUser.id,
    };

    (request as any).delegationContext = nextActor.delegationContext;
    (request as any).onBehalfOfUserId = nextActor.onBehalfOfUserId;
    return nextActor;
  }
}
