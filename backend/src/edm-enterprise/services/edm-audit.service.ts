import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EdmV2AuditLog } from '../entities/edm-audit-log.entity';

@Injectable()
export class EdmAuditService {
  constructor(
    @InjectRepository(EdmV2AuditLog)
    private readonly repo: Repository<EdmV2AuditLog>,
  ) {}

  async log(
    entityType: string,
    entityId: string,
    action: string,
    actorId: number | null,
    options?: {
      changes?: Record<string, [unknown, unknown]>;
      context?: Record<string, unknown>;
      actorIp?: string;
      actorAgent?: string;
    },
  ): Promise<void> {
    const entry = this.repo.create({
      entityType,
      entityId,
      action,
      actorId,
      changes: options?.changes ?? null,
      context: options?.context ?? {},
      actorIp: options?.actorIp ?? null,
      actorAgent: options?.actorAgent ?? null,
    });
    await this.repo.save(entry);
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    limit = 50,
    offset = 0,
  ): Promise<[EdmV2AuditLog[], number]> {
    return this.repo.findAndCount({
      where: { entityType, entityId },
      order: { occurredAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['actor'],
    });
  }
}
