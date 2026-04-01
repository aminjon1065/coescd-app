import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EdmV2DocumentPermission,
  PermissionLevel,
  PrincipalType,
} from '../entities/edm-document-permission.entity';
import { EdmV2Document } from '../entities/edm-document.entity';
import { EdmV2WorkflowAssignment } from '../entities/edm-workflow-assignment.entity';
import { Role } from '../../users/enums/role.enum';

interface UserContext {
  id: number;
  role: Role;
  departmentId?: number | null;
  orgUnitId?: number | null;
  orgUnitPath?: string | null;
}

@Injectable()
export class EdmPermissionsService {
  constructor(
    @InjectRepository(EdmV2DocumentPermission)
    private readonly permRepo: Repository<EdmV2DocumentPermission>,
    @InjectRepository(EdmV2WorkflowAssignment)
    private readonly assignmentRepo: Repository<EdmV2WorkflowAssignment>,
  ) {}

  /* ── Public API ─────────────────────────────────────────────── */

  async can(
    user: UserContext,
    document: EdmV2Document,
    permission: PermissionLevel,
  ): Promise<boolean> {
    if (user.role === Role.Admin) return true;

    // 2. Explicit document-level grant (user or department)
    const grants = await this.permRepo.find({
      where: [
        { documentId: document.id, principalType: 'user', principalId: user.id, permission },
        { documentId: document.id, principalType: 'department', principalId: user.departmentId ?? -1, permission },
      ],
    });

    const validGrant = grants.find((g) => {
      if (g.expiresAt && g.expiresAt < new Date()) return false;
      return this.evaluateConditions(g.conditions, user, document);
    });
    if (validGrant) return true;

    // 3. RBAC + ABAC defaults
    return this.rbacAbacCheck(user, document, permission);
  }

  async canOrThrow(
    user: UserContext,
    document: EdmV2Document,
    permission: PermissionLevel,
  ): Promise<void> {
    const allowed = await this.can(user, document, permission);
    if (!allowed) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException('Insufficient permissions on this document');
    }
  }

  async grant(
    documentId: string,
    principalType: PrincipalType,
    principalId: number,
    permission: PermissionLevel,
    grantedById: number,
    expiresAt?: Date | null,
    conditions?: Record<string, unknown>,
  ): Promise<EdmV2DocumentPermission> {
    const existing = await this.permRepo.findOne({
      where: { documentId, principalType, principalId, permission },
    });
    if (existing) return existing;

    const grant = this.permRepo.create({
      documentId,
      principalType,
      principalId,
      permission,
      grantedById,
      expiresAt: expiresAt ?? null,
      conditions: conditions ?? {},
    });
    return this.permRepo.save(grant);
  }

  async revoke(permissionId: string): Promise<void> {
    await this.permRepo.delete(permissionId);
  }

  async listForDocument(documentId: string): Promise<EdmV2DocumentPermission[]> {
    return this.permRepo.find({ where: { documentId }, relations: ['grantedBy'] });
  }

  /* ── Private helpers ─────────────────────────────────────────── */

  private evaluateConditions(
    conditions: Record<string, unknown>,
    user: UserContext,
    document: EdmV2Document,
  ): boolean {
    if (!conditions || Object.keys(conditions).length === 0) return true;

    if (conditions['dept_match'] === true) {
      if (user.departmentId !== document.departmentId) return false;
    }
    if (conditions['owner_only'] === true) {
      if (user.id !== document.ownerId) return false;
    }
    if (Array.isArray(conditions['status_allows'])) {
      const allowed = conditions['status_allows'] as string[];
      if (!allowed.includes(document.status)) return false;
    }
    return true;
  }

  private async rbacAbacCheck(
    user: UserContext,
    document: EdmV2Document,
    permission: PermissionLevel,
  ): Promise<boolean> {
    const sameOrgSubtree =
      !!user.orgUnitPath &&
      !!document.orgUnit?.path &&
      (document.orgUnit.path === user.orgUnitPath ||
        document.orgUnit.path.startsWith(`${user.orgUnitPath}.`));
    const sameDept = user.departmentId != null && user.departmentId === document.departmentId;
    const isOwner = user.id === document.ownerId;
    const editableStatus = ['draft', 'rejected'].includes(document.status);
    const isAssignee = await this.isCurrentAssignee(user.id, document.id);
    const inScope = isOwner || sameDept || sameOrgSubtree || isAssignee;

    type RuleMap = Record<PermissionLevel, boolean>;
    const rules: Partial<Record<Role, RuleMap>> = {
      [Role.Admin]: { view: true, comment: true, edit: true, approve: true, share: true, delete: true },
      [Role.Chairperson]: { view: true, comment: true, edit: editableStatus, approve: true, share: true, delete: false },
      [Role.FirstDeputy]: { view: true, comment: true, edit: editableStatus, approve: true, share: true, delete: false },
      [Role.Deputy]: { view: true, comment: true, edit: editableStatus, approve: true, share: true, delete: false },
      [Role.DepartmentHead]: { view: inScope, comment: inScope, edit: (isOwner || sameDept || sameOrgSubtree) && editableStatus, approve: isAssignee, share: sameDept || sameOrgSubtree, delete: isOwner && editableStatus },
      [Role.DivisionHead]: { view: inScope, comment: inScope, edit: (isOwner || sameOrgSubtree) && editableStatus, approve: isAssignee, share: sameOrgSubtree, delete: isOwner && editableStatus },
      [Role.Manager]: { view: inScope, comment: inScope, edit: (isOwner || sameDept || sameOrgSubtree) && editableStatus, approve: isAssignee, share: sameDept || sameOrgSubtree, delete: isOwner && editableStatus },
      [Role.Chancellery]: { view: inScope, comment: inScope, edit: (isOwner || sameDept) && editableStatus, approve: isAssignee, share: sameDept, delete: false },
      [Role.Analyst]: { view: inScope, comment: inScope, edit: isOwner && editableStatus, approve: isAssignee, share: isOwner, delete: isOwner && editableStatus },
      [Role.Employee]: { view: inScope, comment: inScope, edit: isOwner && editableStatus, approve: isAssignee, share: isOwner, delete: isOwner && editableStatus },
      [Role.Regular]: { view: inScope, comment: inScope, edit: isOwner && editableStatus, approve: isAssignee, share: isOwner, delete: isOwner && editableStatus },
    };

    return rules[user.role]?.[permission] ?? false;
  }

  private async isCurrentAssignee(userId: number, documentId: string): Promise<boolean> {
    const count = await this.assignmentRepo
      .createQueryBuilder('a')
      .innerJoin('a.instance', 'i')
      .where('a.assignee_id = :userId', { userId })
      .andWhere('i.document_id = :documentId', { documentId })
      .andWhere('i.status = :status', { status: 'active' })
      .andWhere('a.acted_at IS NULL')
      .getCount();
    return count > 0;
  }
}
