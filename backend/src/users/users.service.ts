import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { HashingService } from '../iam/hashing/hashing.service';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from './enums/role.enum';
import { PermissionType } from '../iam/authorization/permission.type';
import { ScopeService } from '../iam/authorization/scope.service';
import { RefreshTokenIdsStorage } from '../iam/authentication/refresh-token-ids.storage/refresh-token-ids.storage';
import { Department } from '../department/entities/department.entity';
import {
  UserChangeAuditAction,
  UserChangeAuditLog,
} from './entities/user-change-audit-log.entity';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { PaginatedResponse } from '../common/http/pagination-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserChangeAuditLog)
    private readonly userChangeAuditRepository: Repository<UserChangeAuditLog>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly hashingService: HashingService,
    private readonly scopeService: ScopeService,
    private readonly refreshTokenIdsStorage: RefreshTokenIdsStorage,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const department = createUserDto.departmentId
      ? await this.departmentRepository.findOneBy({
          id: createUserDto.departmentId,
        })
      : null;

    if (createUserDto.departmentId && !department) {
      throw new NotFoundException(
        `Department with id ${createUserDto.departmentId} not found`,
      );
    }

    const user = this.userRepository.create({
      email: createUserDto.email,
      name: createUserDto.name,
      avatar: createUserDto.avatar,
      position: createUserDto.position,
      role: createUserDto.role ?? Role.Regular,
      password: await this.hashingService.hash(createUserDto.password),
      department: department ?? undefined,
    });
    const created = await this.userRepository.save(user);
    await this.logUserChange({
      action: 'user.create',
      actorId: actor.sub,
      targetUserId: created.id,
      changes: {
        email: created.email,
        role: created.role,
        departmentId: created.department?.id ?? null,
      },
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });
    return created;
  }

  async findAll(
    actor: ActiveUserData,
    query: GetUsersQueryDto,
  ): Promise<PaginatedResponse<User>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;
    const isActiveFilter =
      query.isActive === true || query.isActive === 'true'
        ? true
        : query.isActive === false || query.isActive === 'false'
          ? false
          : undefined;
    const departmentId = query.departmentId
      ? Number(query.departmentId)
      : undefined;
    const search = query.q?.toLowerCase();

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('department.parent', 'departmentParent')
      .leftJoinAndSelect('department.chief', 'departmentChief')
      .orderBy('user.createdAt', query.sortOrder === 'asc' ? 'ASC' : 'DESC');

    if (actor.role === Role.Manager && actor.departmentId) {
      qb.andWhere('department.id = :departmentId', {
        departmentId: actor.departmentId,
      });
    }

    if (actor.role === Role.Regular) {
      qb.andWhere('user.id = :userId', { userId: actor.sub });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (isActiveFilter !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: isActiveFilter });
    }

    if (departmentId) {
      qb.andWhere('department.id = :filterDepartmentId', {
        filterDepartmentId: departmentId,
      });
    }

    if (search) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb
            .where('LOWER(user.email) LIKE :q', {
              q: `%${search}%`,
            })
            .orWhere('LOWER(user.name) LIKE :q', {
              q: `%${search}%`,
            });
        }),
      );
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Lightweight user directory used by Chat / Calls features.
   * Returns all active users except the caller — minimal fields only.
   * Accessible to any user with `chat.read` or `calls.read` permission.
   */
  async getDirectory(excludeUserId: number): Promise<
    Array<{
      id: number;
      name: string;
      email: string;
      position: string | null;
      avatar: string | null;
      department: { id: number; name: string } | null;
    }>
  > {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.id != :excludeId', { excludeId: excludeUserId })
      .orderBy('user.name', 'ASC')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.position',
        'user.avatar',
        'department.id',
        'department.name',
      ])
      .getMany();

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      position: u.position ?? null,
      avatar: u.avatar ?? null,
      department: u.department
        ? { id: u.department.id, name: u.department.name }
        : null,
    }));
  }

  async findOne(id: number, actor: ActiveUserData) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        department: {
          parent: true,
          chief: true,
        },
      },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    this.scopeService.assertUserScope(actor, user);
    return user;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    this.scopeService.assertUserScope(actor, user);
    const before = {
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      position: user.position,
      role: user.role,
      departmentId: user.department?.id ?? null,
    };

    if (
      (updateUserDto.role !== undefined ||
        updateUserDto.departmentId !== undefined) &&
      actor.role !== Role.Admin
    ) {
      throw new ForbiddenException('Only admin can update role or department');
    }

    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }
    if (updateUserDto.avatar !== undefined) {
      user.avatar = updateUserDto.avatar;
    }
    if (updateUserDto.position !== undefined) {
      user.position = updateUserDto.position;
    }
    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }
    if (updateUserDto.departmentId !== undefined) {
      const department = await this.departmentRepository.findOneBy({
        id: updateUserDto.departmentId,
      });
      if (!department) {
        throw new NotFoundException(
          `Department with id ${updateUserDto.departmentId} not found`,
        );
      }
      user.department = department;
    }

    await this.userRepository.save(user);
    const updated = await this.findOne(id, actor);
    await this.logUserChange({
      action: 'user.update',
      actorId: actor.sub,
      targetUserId: updated.id,
      changes: {
        before,
        after: {
          email: updated.email,
          name: updated.name,
          avatar: updated.avatar,
          position: updated.position,
          role: updated.role,
          departmentId: updated.department?.id ?? null,
        },
      },
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });
    return updated;
  }

  async remove(
    id: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    this.scopeService.assertUserScope(actor, user);
    await this.userRepository.remove(user);
    await this.logUserChange({
      action: 'user.delete',
      actorId: actor.sub,
      targetUserId: id,
      changes: {
        email: user.email,
        role: user.role,
      },
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });
    return user;
  }

  async updateCustomPermissions(
    id: number,
    permissions: PermissionType[],
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    const before = [...(user.permissions ?? [])];
    user.permissions = permissions;
    const updated = await this.userRepository.save(user);
    await this.logUserChange({
      action: 'user.permissions.update',
      actorId: actor.sub,
      targetUserId: updated.id,
      changes: {
        before,
        after: updated.permissions,
      },
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });
    return updated;
  }

  async setActive(
    id: number,
    isActive: boolean,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    const before = user.isActive;
    user.isActive = isActive;
    const updated = await this.userRepository.save(user);
    if (!isActive) {
      await this.refreshTokenIdsStorage.invalidate(id);
    }
    await this.logUserChange({
      action: 'user.active.update',
      actorId: actor.sub,
      targetUserId: updated.id,
      changes: {
        before,
        after: updated.isActive,
      },
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });
    return updated;
  }

  private async logUserChange(params: {
    action: UserChangeAuditAction;
    actorId: number | null;
    targetUserId: number | null;
    changes: Record<string, unknown> | null;
    ip: string | null;
    userAgent: string | null;
    reason?: string | null;
  }): Promise<void> {
    const [actor, targetUser] = await Promise.all([
      params.actorId
        ? this.userRepository.findOneBy({ id: params.actorId })
        : null,
      params.targetUserId
        ? this.userRepository.findOneBy({ id: params.targetUserId })
        : null,
    ]);

    await this.userChangeAuditRepository.save(
      this.userChangeAuditRepository.create({
        action: params.action,
        actor: actor ?? null,
        targetUser: targetUser ?? null,
        success: true,
        changes: params.changes,
        ip: params.ip,
        userAgent: params.userAgent,
        reason: params.reason ?? null,
      }),
    );
  }
}
