import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Brackets, Repository } from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import { HashingService } from '../../iam/hashing/hashing.service';
import {
  Permission,
  PermissionType,
} from '../../iam/authorization/permission.type';
import { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { UserChangeAuditLog } from '../entities/user-change-audit-log.entity';
import { User } from '../entities/user.entity';
import { Role } from '../enums/role.enum';
import { BulkImportApplyDto } from '../dto/bulk-import-apply.dto';
import { BulkImportDryRunDto } from '../dto/bulk-import-dry-run.dto';
import { GetBulkImportOperationsQueryDto } from '../dto/get-bulk-import-operations-query.dto';
import {
  BulkImportOperation,
  BulkImportOperationStatus,
} from '../entities/bulk-import-operation.entity';
import {
  BulkImportDryRunSummary,
  BulkImportRow,
  BulkImportRowError,
  BulkImportSession,
} from './bulk-import.types';
import { UsersBulkImportStorage } from './users-bulk-import.storage';

type ExistingUserIndex = Map<string, User>;

type BulkImportOperationListItem = {
  id: number;
  operationId: string;
  sessionId: string | null;
  type: 'dry-run' | 'apply';
  status: 'completed' | 'partial' | 'failed';
  mode: string | null;
  idempotencyKey: string | null;
  totalRows: number | null;
  validRows: number | null;
  invalidRows: number | null;
  createdCount: number | null;
  updatedCount: number | null;
  skippedCount: number | null;
  failedCount: number | null;
  warningsCount: number | null;
  errorsCount: number | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: number; email: string; name: string } | null;
};

@Injectable()
export class UsersBulkImportService {
  private readonly sessionTtlMs = 30 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(UserChangeAuditLog)
    private readonly userChangeAuditRepository: Repository<UserChangeAuditLog>,
    @InjectRepository(BulkImportOperation)
    private readonly bulkImportOperationRepository: Repository<BulkImportOperation>,
    private readonly hashingService: HashingService,
    private readonly storage: UsersBulkImportStorage,
  ) {}

  async dryRun(
    file: Express.Multer.File,
    dto: BulkImportDryRunDto,
    actor: ActiveUserData,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV file is required');
    }

    const mode = dto.mode ?? 'upsert';
    if (mode !== 'upsert') {
      throw new BadRequestException('Only upsert mode is supported');
    }

    const departments = await this.departmentRepository.find();
    const users = await this.userRepository.find({
      relations: { department: true },
    });
    const userIndex = this.toUserIndex(users);

    const maxRows = Number(process.env.BULK_IMPORT_MAX_ROWS ?? '5000');
    const csv = file.buffer.toString('utf8');
    const lines = this.parseCsv(csv);
    if (lines.length < 2) {
      throw new BadRequestException('CSV file has no data rows');
    }

    const headers = lines[0].map((header) => header.trim().toLowerCase());
    const requiredHeaders = ['email', 'name', 'role'];
    for (const requiredHeader of requiredHeaders) {
      if (!headers.includes(requiredHeader)) {
        throw new BadRequestException(
          `Missing required column: ${requiredHeader}`,
        );
      }
    }

    const dataLines = lines.slice(1);
    if (dataLines.length > maxRows) {
      throw new BadRequestException(`Too many rows. Max allowed is ${maxRows}`);
    }

    const errors: BulkImportRowError[] = [];
    const warnings: BulkImportRowError[] = [];
    const rows: BulkImportRow[] = [];

    const emailSeen = new Set<string>();
    const permissionsSet = new Set<PermissionType>(
      Object.values(Permission) as PermissionType[],
    );

    for (let index = 0; index < dataLines.length; index += 1) {
      const rowNumber = index + 2;
      const cells = dataLines[index];
      const record = this.toRecord(headers, cells);

      const rowErrors: BulkImportRowError[] = [];

      const email = (record.email ?? '').trim().toLowerCase();
      const name = (record.name ?? '').trim();
      const role = (record.role ?? '').trim().toLowerCase() as Role;
      const position = (record.position ?? '').trim() || null;
      const password = (record.password ?? '').trim() || null;

      if (!email || !this.isEmail(email)) {
        rowErrors.push(
          this.err(rowNumber, 'email', 'invalid_email', 'Invalid email format'),
        );
      } else if (emailSeen.has(email)) {
        rowErrors.push(
          this.err(
            rowNumber,
            'email',
            'duplicate_email_in_file',
            'Duplicate email in same CSV file',
          ),
        );
      } else {
        emailSeen.add(email);
      }

      if (!name) {
        rowErrors.push(
          this.err(rowNumber, 'name', 'invalid_name', 'Name is required'),
        );
      }

      if (!Object.values(Role).includes(role)) {
        rowErrors.push(
          this.err(rowNumber, 'role', 'invalid_role', 'Role is invalid'),
        );
      }

      const existing = userIndex.get(email);
      if (!existing && !password) {
        rowErrors.push(
          this.err(
            rowNumber,
            'password',
            'password_missing_for_new_user',
            'Password is required for new user',
          ),
        );
      }

      const isActiveRaw = (record.is_active ?? '').trim().toLowerCase();
      let isActive = true;
      if (isActiveRaw) {
        if (isActiveRaw !== 'true' && isActiveRaw !== 'false') {
          rowErrors.push(
            this.err(
              rowNumber,
              'is_active',
              'invalid_is_active',
              'is_active must be true or false',
            ),
          );
        } else {
          isActive = isActiveRaw === 'true';
        }
      }

      const department = this.resolveDepartment(record, departments);
      if (department.error) {
        rowErrors.push(
          this.err(
            rowNumber,
            department.field,
            'department_not_found',
            department.error,
          ),
        );
      }

      const permissions: PermissionType[] = [];
      if ((record.permissions ?? '').trim()) {
        const parsed = record.permissions
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        for (const permission of parsed) {
          if (!permissionsSet.has(permission as PermissionType)) {
            rowErrors.push(
              this.err(
                rowNumber,
                'permissions',
                'invalid_permission',
                `Unsupported permission: ${permission}`,
              ),
            );
          } else {
            permissions.push(permission as PermissionType);
          }
        }
      }

      if (existing?.role === Role.Admin && role !== Role.Admin) {
        warnings.push(
          this.err(
            rowNumber,
            'role',
            'admin_role_change',
            'Existing admin will be changed to non-admin role',
          ),
        );
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      rows.push({
        rowNumber,
        email,
        name,
        role,
        departmentId: department.value?.id ?? null,
        position,
        isActive,
        permissions,
        password,
      });
    }

    const summary = this.buildSummary(
      dataLines.length,
      rows,
      errors,
      userIndex,
    );
    const sessionId = randomUUID();
    const session: BulkImportSession = {
      id: sessionId,
      createdAt: Date.now(),
      actorId: actor.sub,
      mode,
      allowRoleUpdate: dto.allowRoleUpdate ?? true,
      allowPermissionUpdate: dto.allowPermissionUpdate ?? true,
      rows,
      errors,
      warnings,
      summary,
    };
    await this.storage.setSession(
      sessionId,
      session,
      Math.ceil(this.sessionTtlMs / 1000),
    );
    await this.logBulkOperation({
      operationId: randomUUID(),
      actorId: actor.sub,
      type: 'dry-run',
      status: 'completed',
      mode,
      sessionId,
      idempotencyKey: null,
      totalRows: summary.totalRows,
      validRows: summary.validRows,
      invalidRows: summary.invalidRows,
      createdCount: summary.toCreate,
      updatedCount: summary.toUpdate,
      skippedCount: summary.unchanged,
      failedCount: 0,
      warningsCount: warnings.length,
      errorsCount: errors.length,
      details: {
        allowRoleUpdate: session.allowRoleUpdate,
        allowPermissionUpdate: session.allowPermissionUpdate,
      },
      requestMeta: { ip: null, userAgent: null },
    });

    return {
      sessionId,
      summary,
      errors,
      warnings,
    };
  }

  async apply(
    dto: BulkImportApplyDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    if (!dto.confirm) {
      throw new BadRequestException('confirm=true is required');
    }

    const session = await this.storage.getSession(dto.sessionId);
    if (!session) {
      throw new NotFoundException('Preview session not found');
    }
    if (session.actorId !== actor.sub) {
      throw new BadRequestException('Session belongs to another actor');
    }
    if (Date.now() - session.createdAt > this.sessionTtlMs) {
      await this.storage.deleteSession(dto.sessionId);
      throw new BadRequestException('Preview session expired');
    }
    if (session.summary.invalidRows > 0) {
      throw new BadRequestException(
        'Cannot apply: dry-run contains invalid rows',
      );
    }

    const cached = await this.storage.getIdempotency(
      actor.sub,
      dto.idempotencyKey,
    );
    if (cached) {
      return {
        operationId: cached.operationId,
        summary: cached.summary,
        failures: cached.failures,
      };
    }

    const users = await this.userRepository.find({
      relations: { department: true },
    });
    const userIndex = this.toUserIndex(users);
    const departments = await this.departmentRepository.find();
    const departmentIndex = new Map<number, Department>(
      departments.map((department) => [department.id, department]),
    );

    const summary = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };
    const failures: BulkImportRowError[] = [];

    for (const row of session.rows) {
      try {
        const existing = userIndex.get(row.email);
        const department = row.departmentId
          ? (departmentIndex.get(row.departmentId) ?? null)
          : null;

        if (!existing) {
          const created = this.userRepository.create({
            email: row.email,
            password: await this.hashingService.hash(row.password as string),
            name: row.name,
            position: row.position ?? undefined,
            role: row.role,
            permissions: row.permissions,
            isActive: row.isActive,
            department: department ?? undefined,
          });
          const saved = await this.userRepository.save(created);
          userIndex.set(saved.email.toLowerCase(), saved);
          summary.created += 1;
          await this.logAudit({
            action: 'user.create',
            actorId: actor.sub,
            targetUserId: saved.id,
            changes: { bulkImport: true, rowNumber: row.rowNumber },
            requestMeta,
          });
          continue;
        }

        let changed = false;
        if (existing.name !== row.name) {
          existing.name = row.name;
          changed = true;
        }
        if ((existing.position ?? null) !== row.position) {
          existing.position = row.position ?? null;
          changed = true;
        }
        if ((existing.department?.id ?? null) !== (department?.id ?? null)) {
          existing.department = department;
          changed = true;
        }
        if (session.allowRoleUpdate && existing.role !== row.role) {
          existing.role = row.role;
          changed = true;
        }
        if (session.allowPermissionUpdate) {
          const current = [...(existing.permissions ?? [])].sort().join(',');
          const next = [...row.permissions].sort().join(',');
          if (current !== next) {
            existing.permissions = row.permissions;
            changed = true;
          }
        }
        if (existing.isActive !== row.isActive) {
          existing.isActive = row.isActive;
          changed = true;
        }

        if (!changed) {
          summary.skipped += 1;
          continue;
        }

        const saved = await this.userRepository.save(existing);
        summary.updated += 1;
        await this.logAudit({
          action: 'user.update',
          actorId: actor.sub,
          targetUserId: saved.id,
          changes: { bulkImport: true, rowNumber: row.rowNumber },
          requestMeta,
        });
      } catch (error) {
        summary.failed += 1;
        failures.push(
          this.err(
            row.rowNumber,
            'row',
            'apply_failed',
            error instanceof Error ? error.message : 'Unknown apply error',
          ),
        );
      }
    }

    const operationId = randomUUID();
    await this.storage.setIdempotency(
      actor.sub,
      dto.idempotencyKey,
      { operationId, summary, failures },
      Math.ceil(this.sessionTtlMs / 1000),
    );

    const status: BulkImportOperationStatus =
      summary.failed > 0 ? 'partial' : 'completed';
    await this.logBulkOperation({
      operationId,
      actorId: actor.sub,
      type: 'apply',
      status,
      mode: session.mode,
      sessionId: dto.sessionId,
      idempotencyKey: dto.idempotencyKey,
      totalRows: session.summary.totalRows,
      validRows: session.summary.validRows,
      invalidRows: session.summary.invalidRows,
      createdCount: summary.created,
      updatedCount: summary.updated,
      skippedCount: summary.skipped,
      failedCount: summary.failed,
      warningsCount: session.warnings.length,
      errorsCount: failures.length,
      details: {
        allowRoleUpdate: session.allowRoleUpdate,
        allowPermissionUpdate: session.allowPermissionUpdate,
      },
      requestMeta,
    });

    return {
      operationId,
      summary,
      failures,
    };
  }

  async getOperations(query: GetBulkImportOperationsQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const qb = this.bulkImportOperationRepository
      .createQueryBuilder('op')
      .leftJoin('op.actor', 'actor');

    if (query.type) {
      qb.andWhere('op.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('op.status = :status', { status: query.status });
    }
    if (query.actorId) {
      qb.andWhere('actor.id = :actorId', { actorId: query.actorId });
    }
    if (query.from) {
      qb.andWhere('op.created_at >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('op.created_at <= :to', { to: new Date(query.to) });
    }
    if (query.q) {
      const search = query.q.trim().toLowerCase();
      if (search.length > 0) {
        qb.andWhere(
          new Brackets((scopeQb) => {
            scopeQb
              .where('LOWER(op.operation_id) LIKE :q', { q: `%${search}%` })
              .orWhere("LOWER(COALESCE(op.session_id, '')) LIKE :q", {
                q: `%${search}%`,
              })
              .orWhere("LOWER(COALESCE(op.idempotency_key, '')) LIKE :q", {
                q: `%${search}%`,
              })
              .orWhere("LOWER(COALESCE(actor.email, '')) LIKE :q", {
                q: `%${search}%`,
              })
              .orWhere("LOWER(COALESCE(actor.name, '')) LIKE :q", {
                q: `%${search}%`,
              });
          }),
        );
      }
    }

    const total = await qb.getCount();
    const rows = await qb
      .select([
        'op.id AS "id"',
        'op.operation_id AS "operationId"',
        'op.session_id AS "sessionId"',
        'op.type AS "type"',
        'op.status AS "status"',
        'op.mode AS "mode"',
        'op.idempotency_key AS "idempotencyKey"',
        'op.total_rows AS "totalRows"',
        'op.valid_rows AS "validRows"',
        'op.invalid_rows AS "invalidRows"',
        'op.created_count AS "createdCount"',
        'op.updated_count AS "updatedCount"',
        'op.skipped_count AS "skippedCount"',
        'op.failed_count AS "failedCount"',
        'op.warnings_count AS "warningsCount"',
        'op.errors_count AS "errorsCount"',
        'op.details AS "details"',
        'op.ip AS "ip"',
        'op.user_agent AS "userAgent"',
        'op.created_at AS "createdAt"',
        'actor.id AS "actorId"',
        'actor.email AS "actorEmail"',
        'actor.name AS "actorName"',
      ])
      .orderBy('op.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getRawMany<{
        id: number;
        operationId: string;
        sessionId: string | null;
        type: 'dry-run' | 'apply';
        status: 'completed' | 'partial' | 'failed';
        mode: string | null;
        idempotencyKey: string | null;
        totalRows: number | null;
        validRows: number | null;
        invalidRows: number | null;
        createdCount: number | null;
        updatedCount: number | null;
        skippedCount: number | null;
        failedCount: number | null;
        warningsCount: number | null;
        errorsCount: number | null;
        details: Record<string, unknown> | null;
        ip: string | null;
        userAgent: string | null;
        createdAt: Date | string;
        actorId: number | null;
        actorEmail: string | null;
        actorName: string | null;
      }>();

    const items: BulkImportOperationListItem[] = rows.map((row) => {
      const createdAt =
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : new Date(row.createdAt).toISOString();
      if (Number.isNaN(Date.parse(createdAt))) {
        throw new InternalServerErrorException(
          'Invalid createdAt value in bulk import operations',
        );
      }
      return {
        id: row.id,
        operationId: row.operationId,
        sessionId: row.sessionId,
        type: row.type,
        status: row.status,
        mode: row.mode,
        idempotencyKey: row.idempotencyKey,
        totalRows: row.totalRows,
        validRows: row.validRows,
        invalidRows: row.invalidRows,
        createdCount: row.createdCount,
        updatedCount: row.updatedCount,
        skippedCount: row.skippedCount,
        failedCount: row.failedCount,
        warningsCount: row.warningsCount,
        errorsCount: row.errorsCount,
        details: row.details ?? null,
        ip: row.ip,
        userAgent: row.userAgent,
        createdAt,
        actor:
          row.actorId && row.actorEmail && row.actorName
            ? {
                id: row.actorId,
                email: row.actorEmail,
                name: row.actorName,
              }
            : null,
      };
    });

    return {
      total,
      page,
      limit,
      items,
    };
  }

  private buildSummary(
    totalRows: number,
    rows: BulkImportRow[],
    errors: BulkImportRowError[],
    userIndex: ExistingUserIndex,
  ): BulkImportDryRunSummary {
    let toCreate = 0;
    let toUpdate = 0;
    let unchanged = 0;

    for (const row of rows) {
      const existing = userIndex.get(row.email);
      if (!existing) {
        toCreate += 1;
        continue;
      }
      const noChange =
        existing.name === row.name &&
        (existing.position ?? null) === row.position &&
        existing.role === row.role &&
        existing.isActive === row.isActive &&
        (existing.department?.id ?? null) === row.departmentId &&
        [...(existing.permissions ?? [])].sort().join(',') ===
          [...row.permissions].sort().join(',');
      if (noChange) {
        unchanged += 1;
      } else {
        toUpdate += 1;
      }
    }

    return {
      totalRows,
      validRows: rows.length,
      invalidRows: errors
        .map((error) => error.rowNumber)
        .filter((value, idx, arr) => arr.indexOf(value) === idx).length,
      toCreate,
      toUpdate,
      unchanged,
    };
  }

  private toUserIndex(users: User[]): ExistingUserIndex {
    return new Map(users.map((user) => [user.email.toLowerCase(), user]));
  }

  private resolveDepartment(
    record: Record<string, string>,
    departments: Department[],
  ) {
    const byId = (record.department_id ?? '').trim();
    const byName = (record.department_name ?? '').trim();

    if (byId) {
      const id = Number(byId);
      if (!Number.isFinite(id) || id <= 0) {
        return {
          field: 'department_id',
          error: 'department_id must be positive integer',
        };
      }
      const department = departments.find((item) => item.id === id);
      if (!department) {
        return {
          field: 'department_id',
          error: `Department with id ${id} not found`,
        };
      }
      return { value: department };
    }

    if (byName) {
      const department = departments.find(
        (item) => item.name.toLowerCase() === byName.toLowerCase(),
      );
      if (!department) {
        return {
          field: 'department_name',
          error: `Department '${byName}' not found`,
        };
      }
      return { value: department };
    }

    return { value: null as Department | null };
  }

  private toRecord(
    headers: string[],
    values: string[],
  ): Record<string, string> {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (values[index] ?? '').trim();
    });
    return record;
  }

  private parseCsv(content: string): string[][] {
    const lines: string[][] = [];
    const rows = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n');
    for (const row of rows) {
      if (!row.trim()) {
        continue;
      }
      lines.push(this.parseCsvRow(row));
    }
    return lines;
  }

  private parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i += 1) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
        continue;
      }
      current += char;
    }
    result.push(current);
    return result;
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private err(
    rowNumber: number,
    field: string,
    code: string,
    message: string,
  ): BulkImportRowError {
    return { rowNumber, field, code, message };
  }

  private async logAudit(params: {
    action: 'user.create' | 'user.update';
    actorId: number;
    targetUserId: number;
    changes: Record<string, unknown>;
    requestMeta: { ip: string | null; userAgent: string | null };
  }) {
    const [actor, targetUser] = await Promise.all([
      this.userRepository.findOneBy({ id: params.actorId }),
      this.userRepository.findOneBy({ id: params.targetUserId }),
    ]);

    await this.userChangeAuditRepository.save(
      this.userChangeAuditRepository.create({
        action: params.action,
        actor: actor ?? null,
        targetUser: targetUser ?? null,
        success: true,
        changes: params.changes,
        ip: params.requestMeta.ip,
        userAgent: params.requestMeta.userAgent,
        reason: 'bulk-import',
      }),
    );
  }

  private async logBulkOperation(params: {
    operationId: string;
    actorId: number;
    type: 'dry-run' | 'apply';
    status: BulkImportOperationStatus;
    mode: string | null;
    sessionId: string | null;
    idempotencyKey: string | null;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
    warningsCount: number;
    errorsCount: number;
    details: Record<string, unknown> | null;
    requestMeta: { ip: string | null; userAgent: string | null };
  }): Promise<void> {
    const actor = await this.userRepository.findOneBy({ id: params.actorId });
    await this.bulkImportOperationRepository.save(
      this.bulkImportOperationRepository.create({
        operationId: params.operationId,
        sessionId: params.sessionId,
        actor: actor ?? null,
        type: params.type,
        status: params.status,
        mode: params.mode,
        idempotencyKey: params.idempotencyKey,
        totalRows: params.totalRows,
        validRows: params.validRows,
        invalidRows: params.invalidRows,
        createdCount: params.createdCount,
        updatedCount: params.updatedCount,
        skippedCount: params.skippedCount,
        failedCount: params.failedCount,
        warningsCount: params.warningsCount,
        errorsCount: params.errorsCount,
        details: params.details,
        ip: params.requestMeta.ip,
        userAgent: params.requestMeta.userAgent,
      }),
    );
  }
}
