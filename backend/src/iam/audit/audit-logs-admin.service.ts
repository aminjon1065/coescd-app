import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthAuditLog } from '../authentication/entities/auth-audit-log.entity';
import { FileAccessAuditEntity } from '../../files/entities/file-access-audit.entity';
import { UserChangeAuditLog } from '../../users/entities/user-change-audit-log.entity';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';

type AuditLogItem = {
  id: string;
  source: 'auth' | 'user' | 'file';
  action: string;
  success: boolean;
  createdAt: Date;
  ip: string | null;
  userAgent: string | null;
  reason: string | null;
  actor: { id: number; email: string; name: string } | null;
  targetUser: { id: number; email: string; name: string } | null;
  file: { id: number; originalName: string } | null;
  details: Record<string, unknown> | null;
};

@Injectable()
export class AuditLogsAdminService {
  constructor(
    @InjectRepository(AuthAuditLog)
    private readonly authAuditRepository: Repository<AuthAuditLog>,
    @InjectRepository(UserChangeAuditLog)
    private readonly userChangeAuditRepository: Repository<UserChangeAuditLog>,
    @InjectRepository(FileAccessAuditEntity)
    private readonly fileAccessAuditRepository: Repository<FileAccessAuditEntity>,
  ) {}

  async getLogs(query: GetAuditLogsQueryDto) {
    const limit = query.limit ?? 100;
    const source = query.source;

    const [authLogs, userLogs, fileLogs] = await Promise.all([
      source && source !== 'auth'
        ? Promise.resolve([] as AuthAuditLog[])
        : this.authAuditRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
          }),
      source && source !== 'user'
        ? Promise.resolve([] as UserChangeAuditLog[])
        : this.userChangeAuditRepository.find({
            relations: {
              actor: true,
              targetUser: true,
            },
            order: { createdAt: 'DESC' },
            take: limit,
          }),
      source && source !== 'file'
        ? Promise.resolve([] as FileAccessAuditEntity[])
        : this.fileAccessAuditRepository.find({
            relations: {
              actor: true,
              file: true,
            },
            order: { createdAt: 'DESC' },
            take: limit,
          }),
    ]);

    const combined = [
      ...authLogs.map<AuditLogItem>((item) => ({
        id: `auth-${item.id}`,
        source: 'auth',
        action: item.action,
        success: item.success,
        createdAt: item.createdAt,
        ip: item.ip,
        userAgent: item.userAgent,
        reason: item.reason,
        actor: item.userId
          ? {
              id: item.userId,
              email: item.email ?? 'unknown',
              name: 'Unknown',
            }
          : null,
        targetUser: null,
        file: null,
        details: null,
      })),
      ...userLogs.map<AuditLogItem>((item) => ({
        id: `user-${item.id}`,
        source: 'user',
        action: item.action,
        success: item.success,
        createdAt: item.createdAt,
        ip: item.ip,
        userAgent: item.userAgent,
        reason: item.reason,
        actor: item.actor
          ? {
              id: item.actor.id,
              email: item.actor.email,
              name: item.actor.name,
            }
          : null,
        targetUser: item.targetUser
          ? {
              id: item.targetUser.id,
              email: item.targetUser.email,
              name: item.targetUser.name,
            }
          : null,
        file: null,
        details: item.changes ?? null,
      })),
      ...fileLogs.map<AuditLogItem>((item) => ({
        id: `file-${item.id}`,
        source: 'file',
        action: item.action,
        success: item.success,
        createdAt: item.createdAt,
        ip: item.ip,
        userAgent: item.userAgent,
        reason: item.reason,
        actor: item.actor
          ? {
              id: item.actor.id,
              email: item.actor.email,
              name: item.actor.name,
            }
          : null,
        targetUser: null,
        file: item.file
          ? {
              id: item.file.id,
              originalName: item.file.originalName,
            }
          : null,
        details: null,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return {
      total: combined.length,
      items: combined.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}
