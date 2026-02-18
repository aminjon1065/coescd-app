import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../users/enums/role.enum';
import { Permission, PermissionType } from './permission.type';
import { RolePermissionProfile } from './entities/role-permission-profile.entity';
import { DEFAULT_ROLE_PERMISSIONS } from './role-permissions.map';

type RolePermissionsMatrix = Record<Role, PermissionType[]>;

@Injectable()
export class RolePermissionsService implements OnModuleInit {
  private matrix: RolePermissionsMatrix = {
    [Role.Admin]: [...DEFAULT_ROLE_PERMISSIONS[Role.Admin]],
    [Role.Manager]: [...DEFAULT_ROLE_PERMISSIONS[Role.Manager]],
    [Role.Regular]: [...DEFAULT_ROLE_PERMISSIONS[Role.Regular]],
  };

  constructor(
    @InjectRepository(RolePermissionProfile)
    private readonly rolePermissionsRepository: Repository<RolePermissionProfile>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.hydrateFromDatabase();
  }

  getMatrix(): { permissions: PermissionType[]; rolePermissions: RolePermissionsMatrix } {
    return {
      permissions: Object.values(Permission) as PermissionType[],
      rolePermissions: {
        [Role.Admin]: [...this.matrix[Role.Admin]],
        [Role.Manager]: [...this.matrix[Role.Manager]],
        [Role.Regular]: [...this.matrix[Role.Regular]],
      },
    };
  }

  getRolePermissions(role: Role): PermissionType[] {
    return [...(this.matrix[role] ?? [])];
  }

  resolveUserPermissions(
    role: Role,
    customPermissions: PermissionType[] = [],
  ): PermissionType[] {
    return [...new Set([...this.getRolePermissions(role), ...customPermissions])];
  }

  async updateMatrix(next: RolePermissionsMatrix): Promise<RolePermissionsMatrix> {
    const sanitized: RolePermissionsMatrix = {
      [Role.Admin]: this.sanitizePermissions(next[Role.Admin] ?? []),
      [Role.Manager]: this.sanitizePermissions(next[Role.Manager] ?? []),
      [Role.Regular]: this.sanitizePermissions(next[Role.Regular] ?? []),
    };

    const existing = await this.rolePermissionsRepository.find({
      where: {
        role: In([Role.Admin, Role.Manager, Role.Regular]),
      },
    });
    const byRole = new Map(existing.map((item) => [item.role, item]));

    await this.rolePermissionsRepository.save([
      this.rolePermissionsRepository.create({
        id: byRole.get(Role.Admin)?.id,
        role: Role.Admin,
        permissions: sanitized[Role.Admin],
      }),
      this.rolePermissionsRepository.create({
        id: byRole.get(Role.Manager)?.id,
        role: Role.Manager,
        permissions: sanitized[Role.Manager],
      }),
      this.rolePermissionsRepository.create({
        id: byRole.get(Role.Regular)?.id,
        role: Role.Regular,
        permissions: sanitized[Role.Regular],
      }),
    ]);

    this.matrix = sanitized;
    return this.getMatrix().rolePermissions;
  }

  private async hydrateFromDatabase(): Promise<void> {
    const existing = await this.rolePermissionsRepository.find({
      where: {
        role: In([Role.Admin, Role.Manager, Role.Regular]),
      },
    });
    const byRole = new Map(existing.map((item) => [item.role, item]));

    const missingRoles = [Role.Admin, Role.Manager, Role.Regular].filter(
      (role) => !byRole.has(role),
    );
    if (missingRoles.length > 0) {
      await this.rolePermissionsRepository.save(
        missingRoles.map((role) =>
          this.rolePermissionsRepository.create({
            role,
            permissions: DEFAULT_ROLE_PERMISSIONS[role],
          }),
        ),
      );
    }

    const allProfiles = await this.rolePermissionsRepository.find({
      where: {
        role: In([Role.Admin, Role.Manager, Role.Regular]),
      },
    });
    const allByRole = new Map(allProfiles.map((item) => [item.role, item]));

    this.matrix = {
      [Role.Admin]: this.sanitizePermissions(
        allByRole.get(Role.Admin)?.permissions ?? DEFAULT_ROLE_PERMISSIONS[Role.Admin],
      ),
      [Role.Manager]: this.sanitizePermissions(
        allByRole.get(Role.Manager)?.permissions ??
          DEFAULT_ROLE_PERMISSIONS[Role.Manager],
      ),
      [Role.Regular]: this.sanitizePermissions(
        allByRole.get(Role.Regular)?.permissions ??
          DEFAULT_ROLE_PERMISSIONS[Role.Regular],
      ),
    };
  }

  private sanitizePermissions(
    permissions: PermissionType[] | Permission[],
  ): PermissionType[] {
    const allowed = new Set(Object.values(Permission) as PermissionType[]);
    return [...new Set(permissions)].filter((permission): permission is PermissionType =>
      allowed.has(permission as PermissionType),
    );
  }
}
