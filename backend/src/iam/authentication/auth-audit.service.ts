import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthAuditLog } from './entities/auth-audit-log.entity';

interface AuthAuditEntry {
  action: string;
  success: boolean;
  userId?: number | null;
  actorUserId?: number | null;
  onBehalfOfUserId?: number | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  reason?: string | null;
}

@Injectable()
export class AuthAuditService {
  constructor(
    @InjectRepository(AuthAuditLog)
    private readonly auditRepository: Repository<AuthAuditLog>,
  ) {}

  async log(entry: AuthAuditEntry): Promise<void> {
    await this.auditRepository.save(
      this.auditRepository.create({
        action: entry.action,
        success: entry.success,
        userId: entry.userId ?? null,
        actorUserId: entry.actorUserId ?? entry.userId ?? null,
        onBehalfOfUserId: entry.onBehalfOfUserId ?? null,
        email: entry.email ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        reason: entry.reason ?? null,
      }),
    );
  }
}
