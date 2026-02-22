import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActiveUserData } from '../interfaces/activate-user-data.interface';
import { Role } from '../../users/enums/role.enum';
import { User } from '../../users/entities/user.entity';
import { OrgUnit } from '../entities/org-unit.entity';
import { IamDelegation } from '../../edm/entities/iam-delegation.entity';
import { BusinessRoleEntity } from './entities/business-role.entity';

export interface ResolvedScope {
  actorUserId: number;
  role: Role;
  businessRole: string | null;
  isGlobal: boolean;
  departmentIds: number[];
  orgUnitIds: number[];
  orgPathPrefixes: string[];
  allowedDepartmentIds: number[];
  allowedOrgUnitIds: number[];
  allowedOrgPathPrefixes: string[];
  delegation?: {
    id: number;
    delegatorUserId: number;
    onBehalfOfUserId: number | null;
    scopeType: 'department' | 'global';
    scopeDepartmentId: number | null;
    scopeOrgUnitId: number | null;
    permissionSubset: string[];
  } | null;
}

type ResourceShape =
  | {
      resourceType?: 'user' | 'document' | 'task' | 'file' | 'edm_document';
      ownerUserIds?: Array<number | null | undefined>;
      departmentId?: number | null;
      orgUnitId?: number | null;
      orgUnitPath?: string | null;
    }
  | Record<string, any>;

@Injectable()
export class ScopeResolverService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OrgUnit)
    private readonly orgUnitRepository: Repository<OrgUnit>,
    @InjectRepository(IamDelegation)
    private readonly delegationRepository: Repository<IamDelegation>,
    @InjectRepository(BusinessRoleEntity)
    private readonly businessRoleRepository: Repository<BusinessRoleEntity>,
  ) {}

  async resolveScope(actor: ActiveUserData): Promise<ResolvedScope> {
    const user = await this.userRepository.findOne({
      where: { id: actor.sub },
      relations: {
        department: true,
        orgUnit: true,
      },
    });

    const businessRoleCode = actor.businessRole ?? user?.businessRole ?? null;
    const businessRole = businessRoleCode
      ? await this.businessRoleRepository.findOne({
          where: { code: businessRoleCode, isActive: true },
        })
      : null;
    const orgUnitId = actor.orgUnitId ?? user?.orgUnit?.id ?? null;
    const orgUnitPath =
      actor.orgUnitPath ??
      user?.orgUnit?.path ??
      (orgUnitId
        ? (await this.orgUnitRepository.findOne({ where: { id: orgUnitId } }))
            ?.path ?? null
        : null);

    const baseScope: ResolvedScope = {
      actorUserId: actor.sub,
      role: actor.role,
      businessRole: businessRoleCode,
      isGlobal: actor.role === Role.Admin || businessRole?.defaultScope === 'global',
      departmentIds: actor.departmentId ? [actor.departmentId] : [],
      orgUnitIds: orgUnitId ? [orgUnitId] : [],
      orgPathPrefixes:
        orgUnitPath &&
        (businessRole?.defaultScope === 'subtree' || actor.role === Role.Manager)
          ? [orgUnitPath]
          : [],
      delegation: null,
      allowedDepartmentIds: actor.departmentId ? [actor.departmentId] : [],
      allowedOrgUnitIds: orgUnitId ? [orgUnitId] : [],
      allowedOrgPathPrefixes:
        orgUnitPath &&
        (businessRole?.defaultScope === 'subtree' || actor.role === Role.Manager)
          ? [orgUnitPath]
          : [],
    };

    if (!actor.delegationContext?.delegationId) {
      return baseScope;
    }

    const delegation = await this.delegationRepository.findOne({
      where: {
        id: actor.delegationContext.delegationId,
        status: 'active',
        delegateUser: { id: actor.sub },
      } as any,
      relations: {
        delegatorUser: { department: true },
        delegateUser: true,
        scopeDepartment: true,
        scopeOrgUnit: true,
      },
    });

    if (!delegation) {
      return baseScope;
    }

    const now = new Date();
    if (delegation.validFrom > now || delegation.validTo < now) {
      return baseScope;
    }

    if (!this.isDelegationWithinScope(baseScope, delegation)) {
      return baseScope;
    }

    return {
      ...baseScope,
      isGlobal: baseScope.isGlobal && delegation.scopeType === 'global',
      departmentIds:
        delegation.scopeType === 'department' && delegation.scopeDepartment
          ? [delegation.scopeDepartment.id]
          : baseScope.departmentIds,
      orgUnitIds: delegation.scopeOrgUnit ? [delegation.scopeOrgUnit.id] : baseScope.orgUnitIds,
      orgPathPrefixes: delegation.scopeOrgUnit?.path
        ? [delegation.scopeOrgUnit.path]
        : baseScope.orgPathPrefixes,
      allowedDepartmentIds:
        delegation.scopeType === 'department' && delegation.scopeDepartment
          ? [delegation.scopeDepartment.id]
          : baseScope.allowedDepartmentIds,
      allowedOrgUnitIds: delegation.scopeOrgUnit
        ? [delegation.scopeOrgUnit.id]
        : baseScope.allowedOrgUnitIds,
      allowedOrgPathPrefixes: delegation.scopeOrgUnit?.path
        ? [delegation.scopeOrgUnit.path]
        : baseScope.allowedOrgPathPrefixes,
      delegation: {
        id: delegation.id,
        delegatorUserId: delegation.delegatorUser?.id ?? 0,
        onBehalfOfUserId: actor.delegationContext?.onBehalfOfUserId ?? null,
        scopeType: delegation.scopeType,
        scopeDepartmentId: delegation.scopeDepartment?.id ?? null,
        scopeOrgUnitId: delegation.scopeOrgUnit?.id ?? null,
        permissionSubset: delegation.permissionSubset ?? [],
      },
    };
  }

  canAccess(actor: ActiveUserData, resource: ResourceShape): boolean {
    if (actor.role === Role.Admin) {
      return true;
    }

    const normalized = this.normalizeResource(resource);
    if (
      normalized.ownerUserIds.includes(actor.sub) ||
      (!!actor.onBehalfOfUserId &&
        normalized.ownerUserIds.includes(actor.onBehalfOfUserId))
    ) {
      return true;
    }

    const delegated = actor.delegationContext;
    if (delegated?.scopeType === 'global') {
      return true;
    }
    if (
      delegated?.scopeType === 'department' &&
      delegated.scopeDepartmentId &&
      normalized.departmentId === delegated.scopeDepartmentId
    ) {
      return true;
    }

    if (
      actor.role === Role.Manager &&
      actor.departmentId &&
      normalized.departmentId === actor.departmentId
    ) {
      return true;
    }

    if (actor.orgUnitPath && normalized.orgUnitPath) {
      if (normalized.orgUnitPath === actor.orgUnitPath) {
        return true;
      }
      if (normalized.orgUnitPath.startsWith(`${actor.orgUnitPath}.`)) {
        return true;
      }
    }

    return false;
  }

  isDelegationWithinScope(baseScope: ResolvedScope, delegation: IamDelegation): boolean {
    if (delegation.scopeType === 'global') {
      return baseScope.isGlobal;
    }

    const departmentId = delegation.scopeDepartment?.id ?? null;
    if (departmentId && baseScope.departmentIds.includes(departmentId)) {
      return true;
    }

    const delegatedPath = delegation.scopeOrgUnit?.path;
    if (!delegatedPath) {
      return false;
    }

    return baseScope.orgPathPrefixes.some(
      (prefix) => delegatedPath === prefix || delegatedPath.startsWith(`${prefix}.`),
    );
  }

  async isOrgUnitWithinActorScope(
    actor: ActiveUserData,
    orgUnitId: number,
  ): Promise<boolean> {
    const orgUnit = await this.orgUnitRepository.findOne({ where: { id: orgUnitId } });
    const orgPath = orgUnit?.path;
    if (!orgPath) {
      return false;
    }

    const scope = await this.resolveScope(actor);
    if (scope.isGlobal) {
      return true;
    }

    if (scope.allowedOrgUnitIds.includes(orgUnitId)) {
      return true;
    }

    return scope.allowedOrgPathPrefixes.some(
      (prefix) => orgPath === prefix || orgPath.startsWith(`${prefix}.`),
    );
  }

  private normalizeResource(resource: ResourceShape): {
    ownerUserIds: number[];
    departmentId: number | null;
    orgUnitPath: string | null;
  } {
    const raw = resource as Record<string, any>;
    const ownerUserIds = new Set<number>();
    const pushOwner = (value: unknown) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        ownerUserIds.add(value);
      }
    };

    if (Array.isArray(raw.ownerUserIds)) {
      for (const id of raw.ownerUserIds) {
        pushOwner(id);
      }
    }
    pushOwner(raw.ownerId);
    pushOwner(raw.userId);
    pushOwner(raw?.creator?.id);
    pushOwner(raw?.receiver?.id);
    pushOwner(raw?.sender?.id);
    pushOwner(raw?.owner?.id);
    pushOwner(raw?.resourceOwnerId);

    const departmentId =
      raw.departmentId ??
      raw?.department?.id ??
      raw?.scopeDepartment?.id ??
      raw?.creator?.department?.id ??
      raw?.receiver?.department?.id ??
      null;

    const orgUnitPath =
      raw.orgUnitPath ??
      raw?.orgUnit?.path ??
      raw?.scopeOrgUnit?.path ??
      raw?.department?.orgUnit?.path ??
      null;

    return {
      ownerUserIds: [...ownerUserIds],
      departmentId: typeof departmentId === 'number' ? departmentId : null,
      orgUnitPath: typeof orgUnitPath === 'string' ? orgUnitPath : null,
    };
  }
}
