import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../users/enums/role.enum';
import { Permission, PermissionType } from './permission.type';
import { RolePermissionProfile } from './entities/role-permission-profile.entity';
import { DEFAULT_ROLE_PERMISSIONS } from './role-permissions.map';
import { PermissionProfile } from './entities/permission-profile.entity';
import { BusinessRolePermissionProfile } from './entities/business-role-permission-profile.entity';

type RolePermissionsMatrix = Record<Role, PermissionType[]>;
const ALL_ROLES = Object.values(Role) as Role[];

@Injectable()
export class RolePermissionsService implements OnModuleInit {
  private matrix: RolePermissionsMatrix = Object.fromEntries(
    ALL_ROLES.map((role) => [
      role,
      [...(DEFAULT_ROLE_PERMISSIONS[role] ?? [])],
    ]),
  ) as RolePermissionsMatrix;
  private businessRoleMatrix = new Map<string, PermissionType[]>();

  constructor(
    @InjectRepository(RolePermissionProfile)
    private readonly rolePermissionsRepository: Repository<RolePermissionProfile>,
    @InjectRepository(PermissionProfile)
    private readonly permissionProfilesRepository: Repository<PermissionProfile>,
    @InjectRepository(BusinessRolePermissionProfile)
    private readonly businessRolePermissionProfilesRepository: Repository<BusinessRolePermissionProfile>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.hydrateFromDatabase();
    await this.hydrateBusinessRoleProfiles();
  }

  getMatrix(): {
    permissions: PermissionType[];
    rolePermissions: RolePermissionsMatrix;
  } {
    return {
      permissions: Object.values(Permission) as PermissionType[],
      rolePermissions: Object.fromEntries(
        ALL_ROLES.map((role) => [role, [...(this.matrix[role] ?? [])]]),
      ) as RolePermissionsMatrix,
    };
  }

  getRolePermissions(role: Role): PermissionType[] {
    return [...(this.matrix[role] ?? [])];
  }

  resolveUserPermissions(
    role: Role,
    customPermissions: PermissionType[] = [],
    businessRole?: string | null,
  ): PermissionType[] {
    return [
      ...new Set([
        ...this.getRolePermissions(role),
        ...this.getBusinessRolePermissions(businessRole),
        ...customPermissions,
      ]),
    ];
  }

  getBusinessRolePermissions(businessRole?: string | null): PermissionType[] {
    if (!businessRole) {
      return [];
    }
    return [...(this.businessRoleMatrix.get(businessRole) ?? [])];
  }

  async updateMatrix(
    next: Partial<RolePermissionsMatrix>,
  ): Promise<RolePermissionsMatrix> {
    const sanitized: RolePermissionsMatrix = Object.fromEntries(
      ALL_ROLES.map((role) => [
        role,
        this.sanitizePermissions(next[role] ?? this.matrix[role] ?? []),
      ]),
    ) as RolePermissionsMatrix;

    const existing = await this.rolePermissionsRepository.find({
      where: {
        role: In(ALL_ROLES),
      },
    });
    const byRole = new Map(existing.map((item) => [item.role, item]));

    await this.rolePermissionsRepository.save(
      ALL_ROLES.map((role) =>
        this.rolePermissionsRepository.create({
          id: byRole.get(role)?.id,
          role,
          permissions: sanitized[role],
        }),
      ),
    );

    this.matrix = sanitized;
    return this.getMatrix().rolePermissions;
  }

  private async hydrateFromDatabase(): Promise<void> {
    const existing = await this.rolePermissionsRepository.find({
      where: {
        role: In(ALL_ROLES),
      },
    });
    const byRole = new Map(existing.map((item) => [item.role, item]));

    const missingRoles = ALL_ROLES.filter((role) => !byRole.has(role));
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
        role: In(ALL_ROLES),
      },
    });
    const allByRole = new Map(allProfiles.map((item) => [item.role, item]));

    this.matrix = Object.fromEntries(
      ALL_ROLES.map((role) => [
        role,
        this.sanitizePermissions(
          allByRole.get(role)?.permissions ??
            DEFAULT_ROLE_PERMISSIONS[role] ??
            [],
        ),
      ]),
    ) as RolePermissionsMatrix;
  }

  private async hydrateBusinessRoleProfiles(): Promise<void> {
    try {
      const mappings = await this.businessRolePermissionProfilesRepository.find({
        relations: {
          businessRole: true,
          permissionProfile: true,
        },
        order: {
          priority: 'ASC',
          id: 'ASC',
        },
      });

      const next = new Map<string, PermissionType[]>();
      for (const mapping of mappings) {
        const roleCode = mapping.businessRole?.code;
        if (!roleCode) {
          continue;
        }

        const merged = [
          ...(next.get(roleCode) ?? []),
          ...(mapping.permissionProfile?.permissions ?? []),
        ];
        next.set(roleCode, this.sanitizePermissions(merged));
      }
      this.businessRoleMatrix = next;
    } catch {
      // Migration-safe startup fallback before new tables exist.
      this.businessRoleMatrix = new Map();
    }
  }

  private sanitizePermissions(
    permissions: PermissionType[] | Permission[],
  ): PermissionType[] {
    const allowed = new Set(Object.values(Permission) as PermissionType[]);
    return [...new Set(permissions)].filter(
      (permission): permission is PermissionType => allowed.has(permission),
    );
  }
}
