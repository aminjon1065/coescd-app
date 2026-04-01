import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  EdmV2DocumentPermission,
  PermissionLevel,
  PrincipalType,
} from '../entities/edm-document-permission.entity';
import { EdmV2Document } from '../entities/edm-document.entity';
import { EdmV2WorkflowInstance } from '../entities/edm-workflow-instance.entity';
import { EdmV2WorkflowAssignment } from '../entities/edm-workflow-assignment.entity';

interface UserContext {
  id: number;
  role: string;
  departmentId?: number | null;
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
    // 1. Admin bypass
    if (user.role === 'Admin') return true;

    // 2. Explicit document-level grant (user, role, or department)
    const grants = await this.permRepo.find({
      where: [
        { documentId: document.id, principalType: 'user', principalId: user.id, permission },
        { documentId: document.id, principalType: 'role', principalId: user.id, permission },
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
    const sameDept = user.departmentId != null && user.departmentId === document.departmentId;
    const isOwner = user.id === document.ownerId;
    const editableStatus = ['draft', 'rejected'].includes(document.status);
    const isAssignee = await this.isCurrentAssignee(user.id, document.id);

    type RuleMap = Record<PermissionLevel, boolean>;
    const rules: Record<string, RuleMap> = {
      Admin:        { view: true, comment: true, edit: true, approve: true, share: true, delete: true },
      Chairperson:  { view: true, comment: true, edit: sameDept, approve: true, share: sameDept, delete: sameDept },
      FirstDeputy:  { view: sameDept, comment: sameDept, edit: sameDept && editableStatus, approve: isAssignee, share: sameDept, delete: false },
      Deputy:       { view: sameDept, comment: sameDept, edit: isOwner && editableStatus, approve: isAssignee, share: isOwner, delete: false },
      Regular:      { view: isOwner || sameDept, comment: isOwner || sameDept, edit: isOwner && editableStatus, approve: isAssignee, share: isOwner, delete: isOwner },
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
