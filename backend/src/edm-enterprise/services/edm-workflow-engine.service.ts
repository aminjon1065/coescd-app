import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EdmV2WorkflowInstance } from '../entities/edm-workflow-instance.entity';
import { EdmV2WorkflowDefinition, WorkflowStep } from '../entities/edm-workflow-definition.entity';
import { EdmV2WorkflowTransition } from '../entities/edm-workflow-transition.entity';
import { EdmV2WorkflowAssignment } from '../entities/edm-workflow-assignment.entity';
import { EdmV2Document } from '../entities/edm-document.entity';
import { EdmAuditService } from './edm-audit.service';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';

@Injectable()
export class EdmWorkflowEngineService {
  constructor(
    @InjectRepository(EdmV2WorkflowInstance)
    private readonly instanceRepo: Repository<EdmV2WorkflowInstance>,
    @InjectRepository(EdmV2WorkflowDefinition)
    private readonly definitionRepo: Repository<EdmV2WorkflowDefinition>,
    @InjectRepository(EdmV2WorkflowTransition)
    private readonly transitionRepo: Repository<EdmV2WorkflowTransition>,
    @InjectRepository(EdmV2WorkflowAssignment)
    private readonly assignmentRepo: Repository<EdmV2WorkflowAssignment>,
    @InjectRepository(EdmV2Document)
    private readonly docRepo: Repository<EdmV2Document>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    private readonly auditService: EdmAuditService,
  ) {}

  /* ─────────────────────────────────────────────────────────────
   * Start workflow for a newly submitted document
   * ───────────────────────────────────────────────────────────── */
  async start(documentId: string, actorId: number): Promise<EdmV2WorkflowInstance> {
    const doc = await this.docRepo.findOneOrFail({
      where: { id: documentId },
      relations: ['owner', 'department', 'department.chief', 'orgUnit'],
    });

    // Find active workflow definition matching doc type
    const definition = await this.definitionRepo.findOne({
      where: { isActive: true },
      order: { version: 'DESC' },
    });
    if (!definition) throw new NotFoundException('No active workflow definition found');

    const firstStep = definition.steps[0];
    const deadline = this.computeDeadline(definition.slaConfig, firstStep.id);

    const instance = this.instanceRepo.create({
      documentId,
      definitionId: definition.id,
      definitionSnapshot: { steps: definition.steps, slaConfig: definition.slaConfig },
      currentStepId: firstStep.id,
      status: 'active',
      context: {},
      deadline,
    });
    const saved = await this.instanceRepo.save(instance);

    // Assign first step
    await this.resolveAndAssign(saved, firstStep, doc);

    // Sync document status
    await this.docRepo.update(documentId, { status: firstStep.type === 'editing' ? 'draft' : 'review' });

    await this.auditService.log('workflow', saved.id, 'WORKFLOW_STARTED', actorId, {
      context: { documentId, stepId: firstStep.id },
    });

    return this.instanceRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['assignments', 'assignments.assignee', 'definition'],
    });
  }

  /* ─────────────────────────────────────────────────────────────
   * Execute a workflow transition
   * ───────────────────────────────────────────────────────────── */
  async transition(
    documentId: string,
    action: string,
    actorId: number,
    comment?: string,
  ): Promise<EdmV2WorkflowInstance> {
    const instance = await this.instanceRepo.findOneOrFail({
      where: { documentId, status: 'active' },
      relations: ['assignments'],
    });

    const steps: WorkflowStep[] = (instance.definitionSnapshot as any).steps;
    const currentStep = steps.find((s) => s.id === instance.currentStepId);
    if (!currentStep) throw new NotFoundException(`Step "${instance.currentStepId}" not found`);

    const transition = currentStep.transitions.find((t) => t.action === action);
    if (!transition) {
      throw new BadRequestException(`Action "${action}" not allowed at step "${currentStep.id}"`);
    }

    // Validate comment requirement
    if (currentStep.requireComment?.includes(action) && !comment?.trim()) {
      throw new BadRequestException('Comment is required for this action');
    }

    // Validate actor is an assignee for non-owner steps
    if (currentStep.type !== 'editing') {
      const assignment = instance.assignments.find(
        (a) => a.assigneeId === actorId && a.stepId === currentStep.id && !a.actedAt,
      );
      if (!assignment) {
        throw new ForbiddenException('You are not assigned to act on this step');
      }
      // Mark assignment as acted
      await this.assignmentRepo.update(assignment.id, {
        actedAt: new Date(),
        action,
        comment: comment ?? null,
      });
    }

    // Record transition
    const trans = this.transitionRepo.create({
      instanceId: instance.id,
      fromStepId: currentStep.id,
      toStepId: transition.to,
      action,
      actorId,
      comment: comment ?? null,
    });
    await this.transitionRepo.save(trans);

    // Move to next step
    const nextStep = steps.find((s) => s.id === transition.to);
    const isTerminal = !nextStep || nextStep.type === 'terminal';

    if (isTerminal) {
      await this.instanceRepo.update(instance.id, {
        currentStepId: transition.to,
        status: 'completed',
        completedAt: new Date(),
      });
      const newStatus = transition.to === 'signed' ? 'signed'
        : transition.to === 'archived' ? 'archived'
        : action === 'reject' ? 'rejected'
        : 'signed';
      await this.docRepo.update(documentId, { status: newStatus });
    } else {
      const deadline = this.computeDeadline(
        (instance.definitionSnapshot as any).slaConfig,
        nextStep.id,
      );
      await this.instanceRepo.update(instance.id, {
        currentStepId: nextStep.id,
        deadline,
        context: { ...instance.context, escalated: false },
      });

      // Map step type → document status
      const statusMap: Record<string, string> = {
        editing: 'draft',
        review: 'review',
        approval: 'approval',
        signing: 'approval',
      };
      await this.docRepo.update(documentId, {
        status: (statusMap[nextStep.type] ?? 'review') as any,
      });

      // Assign next step
      const doc = await this.docRepo.findOneOrFail({
        where: { id: documentId },
        relations: ['owner', 'department', 'department.chief', 'orgUnit'],
      });
      await this.resolveAndAssign(instance, nextStep, doc);
    }

    await this.auditService.log('workflow', instance.id, 'TRANSITION', actorId, {
      changes: { step: [currentStep.id, transition.to] as [unknown, unknown] },
      context: { action, comment },
    });

    return this.instanceRepo.findOneOrFail({
      where: { id: instance.id },
      relations: ['assignments', 'assignments.assignee', 'transitions', 'transitions.actor'],
    });
  }

  /* ─────────────────────────────────────────────────────────────
   * Get current workflow state for a document
   * ───────────────────────────────────────────────────────────── */
  async getState(documentId: string): Promise<EdmV2WorkflowInstance | null> {
    return this.instanceRepo.findOne({
      where: { documentId },
      order: { startedAt: 'DESC' },
      relations: [
        'assignments',
        'assignments.assignee',
        'transitions',
        'transitions.actor',
        'definition',
      ],
    });
  }

  /* ─────────────────────────────────────────────────────────────
   * List workflow definitions
   * ───────────────────────────────────────────────────────────── */
  async listDefinitions(): Promise<EdmV2WorkflowDefinition[]> {
    return this.definitionRepo.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }

  /* ─────────────────────────────────────────────────────────────
   * SLA breach checker — runs every 5 minutes
   * ───────────────────────────────────────────────────────────── */
  @Cron('*/5 * * * *')
  async checkSlaBreaches(): Promise<void> {
    const overdue = await this.instanceRepo
      .createQueryBuilder('i')
      .where('i.status = :status', { status: 'active' })
      .andWhere('i.deadline < NOW()')
      .andWhere(`NOT (i.context @> '{"escalated":true}'::jsonb)`)
      .getMany();

    for (const instance of overdue) {
      const snapshot = instance.definitionSnapshot as any;
      const escalationConfig = snapshot.escalation?.[instance.currentStepId];
      if (escalationConfig) {
        await this.instanceRepo.update(instance.id, {
          context: { ...instance.context, escalated: true, escalatedAt: new Date() },
        });
        await this.auditService.log('workflow', instance.id, 'SLA_ESCALATED', null, {
          context: { stepId: instance.currentStepId, escalateTo: escalationConfig.to },
        });
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * Helpers
   * ───────────────────────────────────────────────────────────── */
  private async resolveAndAssign(
    instance: EdmV2WorkflowInstance,
    step: WorkflowStep,
    doc: EdmV2Document,
  ): Promise<void> {
    // Clear old unacted assignments for this step
    await this.assignmentRepo.delete({ instanceId: instance.id, stepId: step.id });

    const assigneeIds = await this.resolveAssignees(step, doc);
    const stepDeadline = this.computeDeadline(
      (instance.definitionSnapshot as any).slaConfig,
      step.id,
    );

    for (const assigneeId of assigneeIds) {
      const assignment = this.assignmentRepo.create({
        instanceId: instance.id,
        stepId: step.id,
        assigneeId,
        deadline: stepDeadline,
        isRequired: true,
      });
      await this.assignmentRepo.save(assignment);
    }
  }

  private async resolveAssignees(step: WorkflowStep, doc: EdmV2Document): Promise<number[]> {
    const { assignee } = step;
    if (assignee.type === 'document_owner') return [doc.ownerId];
    if (assignee.type === 'user' && assignee.value) return [parseInt(assignee.value, 10)];
    if (assignee.type === 'role' && assignee.value) {
      const users = await this.userRepo
        .createQueryBuilder('user')
        .where('user.isActive = true')
        .andWhere('(user.role = :role OR user.businessRole = :businessRole)', {
          role: assignee.value,
          businessRole: assignee.value,
        })
        .getMany();
      return users.map((u) => u.id);
    }
    if (assignee.type === 'department_head') {
      const departmentHeadIds = await this.resolveDepartmentHeadAssignees(doc);
      if (departmentHeadIds.length > 0) {
        return departmentHeadIds;
      }
    }
    return [doc.ownerId];
  }

  private async resolveDepartmentHeadAssignees(
    doc: EdmV2Document,
  ): Promise<number[]> {
    if (doc.department?.chief?.id) {
      return [doc.department.chief.id];
    }

    if (doc.departmentId) {
      const department = await this.departmentRepo.findOne({
        where: { id: doc.departmentId },
        relations: ['chief'],
      });
      if (department?.chief?.id) {
        return [department.chief.id];
      }
    }

    if (doc.orgUnitId) {
      const preferredBusinessRoles =
        doc.orgUnit?.type === 'division'
          ? ['Division Head', 'Department Head']
          : ['Department Head', 'Division Head'];

      const users = await this.userRepo
        .createQueryBuilder('user')
        .leftJoin('user.orgUnit', 'orgUnit')
        .where('user.isActive = true')
        .andWhere('orgUnit.id = :orgUnitId', { orgUnitId: doc.orgUnitId })
        .andWhere(
          '(user.businessRole IN (:...businessRoles) OR user.role IN (:...roles))',
          {
            businessRoles: preferredBusinessRoles,
            roles: ['department_head', 'division_head', 'manager'],
          },
        )
        .orderBy(
          `CASE
            WHEN user.businessRole = :primaryBusinessRole THEN 0
            WHEN user.businessRole = :secondaryBusinessRole THEN 1
            WHEN user.role = :primaryRole THEN 2
            WHEN user.role = :secondaryRole THEN 3
            ELSE 4
          END`,
          'ASC',
        )
        .setParameters({
          primaryBusinessRole: preferredBusinessRoles[0],
          secondaryBusinessRole: preferredBusinessRoles[1],
          primaryRole:
            doc.orgUnit?.type === 'division' ? 'division_head' : 'department_head',
          secondaryRole:
            doc.orgUnit?.type === 'division' ? 'department_head' : 'division_head',
        })
        .getMany();

      if (users.length > 0) {
        return users.map((user) => user.id);
      }
    }

    return [];
  }

  private computeDeadline(
    slaConfig: Record<string, number>,
    stepId: string,
  ): Date | null {
    const minutes = slaConfig[stepId];
    if (!minutes) return null;
    return new Date(Date.now() + minutes * 60 * 1000);
  }
}
