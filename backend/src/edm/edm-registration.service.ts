import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { EntityManager } from 'typeorm';
import { EdmDocument } from './entities/edm-document.entity';
import { EdmDocumentRegistrySequence } from './entities/edm-document-registry-sequence.entity';
import { EdmRegistrationJournal } from './entities/edm-registration-journal.entity';
import { EdmDocumentTaskLink } from './entities/edm-document-task-link.entity';
import { Task } from '../task/entities/task.entity';
import { User } from '../users/entities/user.entity';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { ScopeService } from '../iam/authorization/scope.service';
import { EdmCoreService } from './edm-core.service';
import {
  GetRegistrationJournalQueryDto,
  UpdateRegistrationStatusDto,
} from './dto/registration-journal.dto';
import { CreateResolutionTasksDto } from './dto/document-resolution-tasks.dto';
import { PaginatedResponse } from '../common/http/pagination-query.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EdmDocumentRegisteredEvent, EdmEvents } from './events/edm-events';

@Injectable()
export class EdmRegistrationService {
  constructor(
    @InjectRepository(EdmDocument)
    private readonly edmDocumentRepo: Repository<EdmDocument>,
    @InjectRepository(EdmDocumentRegistrySequence)
    private readonly edmSequenceRepo: Repository<EdmDocumentRegistrySequence>,
    @InjectRepository(EdmRegistrationJournal)
    private readonly registrationJournalRepo: Repository<EdmRegistrationJournal>,
    @InjectRepository(EdmDocumentTaskLink)
    private readonly documentTaskLinkRepo: Repository<EdmDocumentTaskLink>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly core: EdmCoreService,
    private readonly scopeService: ScopeService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async registerDocument(documentId: number, actor: ActiveUserData) {
    const document = await this.core.getDocumentOrFail(documentId);
    this.core.assertDocumentScope(actor, document);

    if (document.type !== 'incoming' && document.type !== 'outgoing') {
      throw new BadRequestException(
        'Only incoming/outgoing documents can be registered in journal',
      );
    }
    const journalType = document.type === 'incoming' ? 'incoming' : 'outgoing';

    const record = await this.dataSource.transaction(async (manager) => {
      const existingJournal = await manager
        .getRepository(EdmRegistrationJournal)
        .findOne({
          where: { document: { id: document.id } },
          relations: { createdBy: true, updatedBy: true, document: true },
        });

      if (existingJournal?.status === 'registered') {
        throw new ConflictException('Document is already registered');
      }

      if (!document.externalNumber) {
        document.externalNumber = await this.assignExternalNumber(
          manager,
          document,
        );
        await manager.getRepository(EdmDocument).save(document);
      }

      const actorUser = await manager
        .getRepository(User)
        .findOneBy({ id: actor.sub });
      if (!actorUser) {
        throw new NotFoundException('Actor not found');
      }

      const registrationNumber = document.externalNumber;
      const registeredAt = new Date();

      const journalRecord =
        existingJournal ??
        manager.getRepository(EdmRegistrationJournal).create({
          document,
          createdBy: actorUser,
          journalType,
          registrationNumber,
          status: 'registered',
          registeredAt,
          cancelledAt: null,
          updatedBy: actorUser,
        });

      journalRecord.journalType = journalType;
      journalRecord.registrationNumber = registrationNumber;
      journalRecord.status = 'registered';
      journalRecord.registeredAt = registeredAt;
      journalRecord.cancelledAt = null;
      journalRecord.updatedBy = actorUser;

      return manager.getRepository(EdmRegistrationJournal).save(journalRecord);
    });

    this.eventEmitter.emit(
      EdmEvents.DOCUMENT_REGISTERED,
      new EdmDocumentRegisteredEvent(
        document.id,
        actor.sub,
        record.registrationNumber,
        record.journalType,
      ),
    );

    return record;
  }

  async updateRegistrationStatus(
    documentId: number,
    dto: UpdateRegistrationStatusDto,
    actor: ActiveUserData,
  ) {
    const document = await this.core.getDocumentOrFail(documentId);
    this.core.assertDocumentScope(actor, document);

    const journalRecord = await this.registrationJournalRepo.findOne({
      where: { document: { id: document.id } },
      relations: { document: true, createdBy: true, updatedBy: true },
    });
    if (!journalRecord) {
      throw new NotFoundException('Registration journal record not found');
    }

    journalRecord.status = dto.status;
    journalRecord.cancelledAt = dto.status === 'cancelled' ? new Date() : null;
    journalRecord.updatedBy = await this.userRepo.findOneBy({ id: actor.sub });

    return this.registrationJournalRepo.save(journalRecord);
  }

  async listRegistrationJournal(
    actor: ActiveUserData,
    query: GetRegistrationJournalQueryDto,
  ): Promise<PaginatedResponse<EdmRegistrationJournal>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const qb = this.registrationJournalRepo
      .createQueryBuilder('journal')
      .leftJoinAndSelect('journal.document', 'document')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.creator', 'creator')
      .leftJoinAndSelect('journal.createdBy', 'createdBy')
      .leftJoinAndSelect('journal.updatedBy', 'updatedBy')
      .orderBy('journal.registeredAt', 'DESC');

    if (query.journalType) {
      qb.andWhere('journal.journalType = :journalType', {
        journalType: query.journalType,
      });
    }
    if (query.status) {
      qb.andWhere('journal.status = :status', { status: query.status });
    }
    if (query.departmentId) {
      qb.andWhere('department.id = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (query.registrationNumber) {
      qb.andWhere('journal.registrationNumber = :registrationNumber', {
        registrationNumber: query.registrationNumber,
      });
    }
    if (query.fromDate) {
      qb.andWhere('journal.registeredAt >= :fromDate', {
        fromDate: new Date(query.fromDate),
      });
    }
    if (query.toDate) {
      qb.andWhere('journal.registeredAt <= :toDate', {
        toDate: new Date(query.toDate),
      });
    }

    if (!this.core.isGlobalEdmRole(actor.role)) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb
            .where('creator.id = :actorId', { actorId: actor.sub })
            .orWhere('department.id = :departmentId', {
              departmentId: actor.departmentId ?? -1,
            });
        }),
      );
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async createResolutionTasks(
    documentId: number,
    dto: CreateResolutionTasksDto,
    actor: ActiveUserData,
  ) {
    if (!dto.tasks.length) {
      throw new BadRequestException('At least one task is required');
    }

    const document = await this.core.getDocumentOrFail(documentId);
    this.core.assertDocumentScope(actor, document);

    const creator = await this.userRepo.findOne({
      where: { id: actor.sub },
      relations: { department: true },
    });
    if (!creator) {
      throw new NotFoundException('Actor not found');
    }

    if (dto.resolutionText !== undefined) {
      document.resolutionText = dto.resolutionText;
      await this.edmDocumentRepo.save(document);
    }

    return this.dataSource.transaction(async (manager) => {
      const createdTasks: Task[] = [];

      for (const taskDto of dto.tasks) {
        const receiver = await manager.getRepository(User).findOne({
          where: { id: taskDto.receiverId },
          relations: { department: true },
        });
        if (!receiver) {
          throw new NotFoundException(
            `Receiver ${taskDto.receiverId} not found`,
          );
        }

        if (
          !this.core.isGlobalEdmRole(actor.role) &&
          receiver.department?.id !== creator.department?.id
        ) {
          throw new ForbiddenException(
            `Receiver ${taskDto.receiverId} is outside your department scope`,
          );
        }

        const descriptionParts = [
          taskDto.description?.trim() || null,
          document.resolutionText
            ? `Resolution: ${document.resolutionText}`
            : null,
          `DocumentId: ${document.id}`,
        ].filter(Boolean);

        const task = await manager.getRepository(Task).save(
          manager.getRepository(Task).create({
            title: taskDto.title,
            description: descriptionParts.join('\n\n'),
            creator,
            receiver,
            status: 'new',
          }),
        );

        await manager.getRepository(EdmDocumentTaskLink).save(
          manager.getRepository(EdmDocumentTaskLink).create({
            document,
            task,
            createdBy: creator,
          }),
        );

        createdTasks.push(task);
      }

      return createdTasks;
    });
  }

  async listDocumentTasks(
    documentId: number,
    actor: ActiveUserData,
  ): Promise<Task[]> {
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertDocumentReadScope(actor, document);

    const links = await this.documentTaskLinkRepo.find({
      where: { document: { id: documentId } },
      relations: {
        task: {
          creator: { department: true },
          receiver: { department: true },
        },
      },
      order: { createdAt: 'DESC' },
    });

    return links
      .map((link) => link.task)
      .filter((task) => {
        try {
          this.scopeService.assertTaskScope(actor, task);
          return true;
        } catch {
          return false;
        }
      });
  }

  async getDocumentTaskProgress(documentId: number, actor: ActiveUserData) {
    const tasks = await this.listDocumentTasks(documentId, actor);
    const total = tasks.length;
    const completed = tasks.filter(
      (task) => task.status === 'completed',
    ).length;
    const inProgress = tasks.filter(
      (task) => task.status === 'in_progress',
    ).length;
    const newCount = tasks.filter((task) => task.status === 'new').length;
    return {
      documentId,
      total,
      completed,
      inProgress,
      new: newCount,
      completionRate:
        total > 0 ? Number(((completed / total) * 100).toFixed(2)) : 0,
    };
  }

  private async assignExternalNumber(
    manager: EntityManager,
    document: EdmDocument,
  ): Promise<string> {
    const now = new Date();
    const year = now.getUTCFullYear();

    const sequenceRepo = manager.getRepository(EdmDocumentRegistrySequence);
    let sequence = await sequenceRepo.findOne({
      where: {
        department: { id: document.department.id },
        docType: document.type,
        year,
      },
      relations: {
        department: true,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!sequence) {
      sequence = await sequenceRepo.save(
        sequenceRepo.create({
          department: document.department,
          docType: document.type,
          year,
          lastValue: 0,
        }),
      );
    }

    sequence.lastValue += 1;
    await sequenceRepo.save(sequence);

    const seq = String(sequence.lastValue).padStart(6, '0');
    const deptCode = `DEPT${document.department.id}`;
    return `${deptCode}-${document.type.toUpperCase()}-${year}-${seq}`;
  }
}
