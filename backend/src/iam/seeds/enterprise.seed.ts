import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { Role } from '../../users/enums/role.enum';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { DepartmentEnum } from '../../department/enums/department.enum';
import { OrgUnit, OrgUnitType } from '../entities/org-unit.entity';
import { HashingService } from '../hashing/hashing.service';
import { BusinessRoleEntity } from '../authorization/entities/business-role.entity';

type SeedOrgUnitSpec = {
  name: string;
  type: OrgUnitType;
  parent?: OrgUnit | null;
};

type SeedDepartmentSpec = {
  name: string;
  type: DepartmentEnum;
  parent?: Department | null;
};

type SeedUserSpec = {
  email: string;
  name: string;
  role: Role;
  department: Department | null;
  orgUnit: OrgUnit | null;
  businessRole: string;
};

type SeedOutcome = 'created' | 'updated' | 'unchanged';

@Injectable()
export class EnterpriseIamSeed {
  private readonly logger = new Logger(EnterpriseIamSeed.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly hashingService: HashingService,
  ) {}

  async run(): Promise<void> {
    const defaultPassword = process.env.IAM_SEED_DEFAULT_PASSWORD;
    if (!defaultPassword) {
      this.logger.error(
        'IAM_SEED_DEFAULT_PASSWORD is required to run enterprise IAM seed.',
      );
      return;
    }

    const summary = {
      orgUnits: { created: 0, updated: 0 },
      departments: { created: 0, updated: 0 },
      businessRoles: { created: 0, updated: 0 },
      users: { created: 0, updated: 0 },
      chiefs: { updated: 0 },
    };

    await this.dataSource.transaction(async (manager) => {
      const orgUnits = await this.ensureOrgUnits(manager, summary);
      const departments = await this.ensureDepartments(manager, summary);
      await this.ensureBusinessRoles(manager, summary);
      await this.ensureUsers(manager, orgUnits, departments, defaultPassword, summary);
      await this.ensureChiefs(manager, departments, summary);
    });

    this.logger.log(
      `Enterprise IAM seed completed. OrgUnits: +${summary.orgUnits.created}/~${summary.orgUnits.updated}, ` +
        `Departments: +${summary.departments.created}/~${summary.departments.updated}, ` +
        `BusinessRoles: +${summary.businessRoles.created}/~${summary.businessRoles.updated}, ` +
        `Users: +${summary.users.created}/~${summary.users.updated}, ` +
        `Chiefs updated: ${summary.chiefs.updated}.`,
    );
  }

  private async ensureOrgUnits(
    manager: EntityManager,
    summary: {
      orgUnits: { created: number; updated: number };
    },
  ): Promise<Map<string, OrgUnit>> {
    const map = new Map<string, OrgUnit>();
    const orgUnitRepository = manager.getRepository(OrgUnit);

    const root = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'COESCD',
      type: 'committee',
      parent: null,
    });
    this.bump(summary.orgUnits, root.outcome);
    map.set(root.entity.name, root.entity);

    const chairOffice = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'Chairperson Office',
      type: 'department',
      parent: root.entity,
    });
    this.bump(summary.orgUnits, chairOffice.outcome);
    map.set(chairOffice.entity.name, chairOffice.entity);

    const operations = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'Operations Department',
      type: 'department',
      parent: root.entity,
    });
    this.bump(summary.orgUnits, operations.outcome);
    map.set(operations.entity.name, operations.entity);

    const divisionNorth = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'Division North',
      type: 'division',
      parent: operations.entity,
    });
    this.bump(summary.orgUnits, divisionNorth.outcome);
    map.set(divisionNorth.entity.name, divisionNorth.entity);

    const divisionSouth = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'Division South',
      type: 'division',
      parent: operations.entity,
    });
    this.bump(summary.orgUnits, divisionSouth.outcome);
    map.set(divisionSouth.entity.name, divisionSouth.entity);

    const emergency = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'Emergency Response Department',
      type: 'department',
      parent: root.entity,
    });
    this.bump(summary.orgUnits, emergency.outcome);
    map.set(emergency.entity.name, emergency.entity);

    const rapid = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'Rapid Response Unit',
      type: 'division',
      parent: emergency.entity,
    });
    this.bump(summary.orgUnits, rapid.outcome);
    map.set(rapid.entity.name, rapid.entity);

    const logistics = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'Logistics Unit',
      type: 'division',
      parent: emergency.entity,
    });
    this.bump(summary.orgUnits, logistics.outcome);
    map.set(logistics.entity.name, logistics.entity);

    const analytics = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'Analytics Department',
      type: 'department',
      parent: root.entity,
    });
    this.bump(summary.orgUnits, analytics.outcome);
    map.set(analytics.entity.name, analytics.entity);

    const generalOffice = await this.ensureOrgUnit(orgUnitRepository, {
      name: 'General Office',
      type: 'department',
      parent: root.entity,
    });
    this.bump(summary.orgUnits, generalOffice.outcome);
    map.set(generalOffice.entity.name, generalOffice.entity);

    return map;
  }

  private async ensureDepartments(
    manager: EntityManager,
    summary: {
      departments: { created: number; updated: number };
    },
  ): Promise<Map<string, Department>> {
    const map = new Map<string, Department>();
    const departmentRepository = manager.getRepository(Department);

    const root = await this.ensureDepartment(departmentRepository, {
      name: 'COESCD',
      type: DepartmentEnum.MAIN,
      parent: null,
    });
    this.bump(summary.departments, root.outcome);
    map.set(root.entity.name, root.entity);

    const chairOffice = await this.ensureDepartment(departmentRepository, {
      name: 'Chairperson Office',
      type: DepartmentEnum.MANAGEMENT,
      parent: root.entity,
    });
    this.bump(summary.departments, chairOffice.outcome);
    map.set(chairOffice.entity.name, chairOffice.entity);

    const operations = await this.ensureDepartment(departmentRepository, {
      name: 'Operations Department',
      type: DepartmentEnum.MANAGEMENT,
      parent: root.entity,
    });
    this.bump(summary.departments, operations.outcome);
    map.set(operations.entity.name, operations.entity);

    const divisionNorth = await this.ensureDepartment(departmentRepository, {
      name: 'Division North',
      type: DepartmentEnum.DIVISION,
      parent: operations.entity,
    });
    this.bump(summary.departments, divisionNorth.outcome);
    map.set(divisionNorth.entity.name, divisionNorth.entity);

    const divisionSouth = await this.ensureDepartment(departmentRepository, {
      name: 'Division South',
      type: DepartmentEnum.DIVISION,
      parent: operations.entity,
    });
    this.bump(summary.departments, divisionSouth.outcome);
    map.set(divisionSouth.entity.name, divisionSouth.entity);

    const emergency = await this.ensureDepartment(departmentRepository, {
      name: 'Emergency Response Department',
      type: DepartmentEnum.MANAGEMENT,
      parent: root.entity,
    });
    this.bump(summary.departments, emergency.outcome);
    map.set(emergency.entity.name, emergency.entity);

    const rapid = await this.ensureDepartment(departmentRepository, {
      name: 'Rapid Response Unit',
      type: DepartmentEnum.SECTION,
      parent: emergency.entity,
    });
    this.bump(summary.departments, rapid.outcome);
    map.set(rapid.entity.name, rapid.entity);

    const logistics = await this.ensureDepartment(departmentRepository, {
      name: 'Logistics Unit',
      type: DepartmentEnum.SECTION,
      parent: emergency.entity,
    });
    this.bump(summary.departments, logistics.outcome);
    map.set(logistics.entity.name, logistics.entity);

    const analytics = await this.ensureDepartment(departmentRepository, {
      name: 'Analytics Department',
      type: DepartmentEnum.MANAGEMENT,
      parent: root.entity,
    });
    this.bump(summary.departments, analytics.outcome);
    map.set(analytics.entity.name, analytics.entity);

    const generalOffice = await this.ensureDepartment(departmentRepository, {
      name: 'General Office',
      type: DepartmentEnum.MANAGEMENT,
      parent: root.entity,
    });
    this.bump(summary.departments, generalOffice.outcome);
    map.set(generalOffice.entity.name, generalOffice.entity);

    return map;
  }

  private async ensureBusinessRoles(
    manager: EntityManager,
    summary: {
      businessRoles: { created: number; updated: number };
    },
  ): Promise<void> {
    const repository = manager.getRepository(BusinessRoleEntity);
    const roles: Array<{
      code: string;
      name: string;
      defaultScope: BusinessRoleEntity['defaultScope'];
    }> = [
      { code: 'Chairperson', name: 'Chairperson', defaultScope: 'global' },
      { code: 'First Deputy', name: 'First Deputy', defaultScope: 'global' },
      { code: 'Deputy', name: 'Deputy', defaultScope: 'global' },
      { code: 'Department Head', name: 'Department Head', defaultScope: 'department' },
      { code: 'Division Head', name: 'Division Head', defaultScope: 'subtree' },
      { code: 'Employee', name: 'Employee', defaultScope: 'self' },
      { code: 'Analyst', name: 'Analyst', defaultScope: 'department' },
      { code: 'Admin', name: 'Admin', defaultScope: 'global' },
    ];

    for (const role of roles) {
      const existing = await repository.findOne({
        where: { code: role.code },
      });

      if (existing) {
        let shouldSave = false;
        if (existing.name !== role.name) {
          existing.name = role.name;
          shouldSave = true;
        }
        if (existing.defaultScope !== role.defaultScope) {
          existing.defaultScope = role.defaultScope;
          shouldSave = true;
        }
        if (!existing.isActive) {
          existing.isActive = true;
          shouldSave = true;
        }
        if (shouldSave) {
          await repository.save(existing);
          summary.businessRoles.updated += 1;
        }
        continue;
      }

      await repository.save(
        repository.create({
          code: role.code,
          name: role.name,
          defaultScope: role.defaultScope,
          isActive: true,
        }),
      );
      summary.businessRoles.created += 1;
    }
  }

  private async ensureUsers(
    manager: EntityManager,
    orgUnits: Map<string, OrgUnit>,
    departments: Map<string, Department>,
    defaultPassword: string,
    summary: {
      users: { created: number; updated: number };
    },
  ): Promise<void> {
    const userRepository = manager.getRepository(User);
    const users: SeedUserSpec[] = [
      {
        email: 'chairperson@coescd.local',
        name: 'Chairperson',
        role: Role.Chairperson,
        department: departments.get('Chairperson Office') ?? null,
        orgUnit: orgUnits.get('Chairperson Office') ?? null,
        businessRole: 'Chairperson',
      },
      {
        email: 'first.deputy@coescd.local',
        name: 'First Deputy',
        role: Role.FirstDeputy,
        department: departments.get('General Office') ?? null,
        orgUnit: orgUnits.get('General Office') ?? null,
        businessRole: 'First Deputy',
      },
      {
        email: 'deputy@coescd.local',
        name: 'Deputy',
        role: Role.Deputy,
        department: departments.get('Analytics Department') ?? null,
        orgUnit: orgUnits.get('Analytics Department') ?? null,
        businessRole: 'Deputy',
      },
      {
        email: 'ops.head@coescd.local',
        name: 'Operations Department Head',
        role: Role.DepartmentHead,
        department: departments.get('Operations Department') ?? null,
        orgUnit: orgUnits.get('Operations Department') ?? null,
        businessRole: 'Department Head',
      },
      {
        email: 'emergency.head@coescd.local',
        name: 'Emergency Response Department Head',
        role: Role.DepartmentHead,
        department: departments.get('Emergency Response Department') ?? null,
        orgUnit: orgUnits.get('Emergency Response Department') ?? null,
        businessRole: 'Department Head',
      },
      {
        email: 'division.north.head@coescd.local',
        name: 'Division North Head',
        role: Role.DivisionHead,
        department: departments.get('Division North') ?? null,
        orgUnit: orgUnits.get('Division North') ?? null,
        businessRole: 'Division Head',
      },
      {
        email: 'division.south.head@coescd.local',
        name: 'Division South Head',
        role: Role.DivisionHead,
        department: departments.get('Division South') ?? null,
        orgUnit: orgUnits.get('Division South') ?? null,
        businessRole: 'Division Head',
      },
      {
        email: 'employee.north1@coescd.local',
        name: 'Employee North 1',
        role: Role.Employee,
        department: departments.get('Division North') ?? null,
        orgUnit: orgUnits.get('Division North') ?? null,
        businessRole: 'Employee',
      },
      {
        email: 'employee.north2@coescd.local',
        name: 'Employee North 2',
        role: Role.Employee,
        department: departments.get('Division North') ?? null,
        orgUnit: orgUnits.get('Division North') ?? null,
        businessRole: 'Employee',
      },
      {
        email: 'employee.south1@coescd.local',
        name: 'Employee South 1',
        role: Role.Employee,
        department: departments.get('Division South') ?? null,
        orgUnit: orgUnits.get('Division South') ?? null,
        businessRole: 'Employee',
      },
      {
        email: 'employee.south2@coescd.local',
        name: 'Employee South 2',
        role: Role.Employee,
        department: departments.get('Division South') ?? null,
        orgUnit: orgUnits.get('Division South') ?? null,
        businessRole: 'Employee',
      },
      {
        email: 'employee.rapid@coescd.local',
        name: 'Employee Rapid Response',
        role: Role.Employee,
        department: departments.get('Rapid Response Unit') ?? null,
        orgUnit: orgUnits.get('Rapid Response Unit') ?? null,
        businessRole: 'Employee',
      },
      {
        email: 'employee.logistics@coescd.local',
        name: 'Employee Logistics',
        role: Role.Employee,
        department: departments.get('Logistics Unit') ?? null,
        orgUnit: orgUnits.get('Logistics Unit') ?? null,
        businessRole: 'Employee',
      },
      {
        email: 'analyst@coescd.local',
        name: 'Lead Analyst',
        role: Role.Analyst,
        department: departments.get('Analytics Department') ?? null,
        orgUnit: orgUnits.get('Analytics Department') ?? null,
        businessRole: 'Analyst',
      },
      {
        email: 'admin@coescd.local',
        name: 'IAM Admin',
        role: Role.Admin,
        department: departments.get('General Office') ?? null,
        orgUnit: orgUnits.get('General Office') ?? null,
        businessRole: 'Admin',
      },
    ];

    for (const user of users) {
      const outcome = await this.ensureUser(
        userRepository,
        user,
        defaultPassword,
      );
      this.bump(summary.users, outcome);
    }
  }

  private async ensureChiefs(
    manager: EntityManager,
    departments: Map<string, Department>,
    summary: {
      chiefs: { updated: number };
    },
  ): Promise<void> {
    const departmentRepository = manager.getRepository(Department);
    const userRepository = manager.getRepository(User);

    const chiefAssignments: Array<{
      departmentName: string;
      chiefEmail: string;
    }> = [
      { departmentName: 'COESCD', chiefEmail: 'chairperson@coescd.local' },
      {
        departmentName: 'Chairperson Office',
        chiefEmail: 'chairperson@coescd.local',
      },
      {
        departmentName: 'Operations Department',
        chiefEmail: 'ops.head@coescd.local',
      },
      {
        departmentName: 'Emergency Response Department',
        chiefEmail: 'emergency.head@coescd.local',
      },
      {
        departmentName: 'Division North',
        chiefEmail: 'division.north.head@coescd.local',
      },
      {
        departmentName: 'Division South',
        chiefEmail: 'division.south.head@coescd.local',
      },
      {
        departmentName: 'Rapid Response Unit',
        chiefEmail: 'emergency.head@coescd.local',
      },
      {
        departmentName: 'Logistics Unit',
        chiefEmail: 'emergency.head@coescd.local',
      },
      {
        departmentName: 'Analytics Department',
        chiefEmail: 'deputy@coescd.local',
      },
      {
        departmentName: 'General Office',
        chiefEmail: 'first.deputy@coescd.local',
      },
    ];

    for (const assignment of chiefAssignments) {
      const department =
        departments.get(assignment.departmentName) ??
        (await departmentRepository.findOne({
          where: { name: assignment.departmentName },
          relations: { chief: true },
        }));
      if (!department) {
        continue;
      }

      const chief = await userRepository.findOneBy({
        email: assignment.chiefEmail,
      });
      if (!chief) {
        continue;
      }

      if (department.chief?.id === chief.id) {
        continue;
      }

      department.chief = chief;
      await departmentRepository.save(department);
      summary.chiefs.updated += 1;
    }
  }

  private async ensureOrgUnit(
    repository: Repository<OrgUnit>,
    spec: SeedOrgUnitSpec,
  ): Promise<{ entity: OrgUnit; outcome: SeedOutcome }> {
    const parentId = spec.parent?.id ?? null;
    const existing = await repository.findOne({
      where: {
        name: spec.name,
        parent: parentId ? { id: parentId } : IsNull(),
      },
      relations: { parent: true },
    });

    const desiredPath = this.buildOrgUnitPath(spec.name, spec.parent ?? null);

    if (existing) {
      let shouldSave = false;
      if (existing.type !== spec.type) {
        existing.type = spec.type;
        shouldSave = true;
      }

      const existingParentId = existing.parent?.id ?? null;
      if (existingParentId !== parentId) {
        existing.parent = spec.parent ?? null;
        shouldSave = true;
      }

      if (existing.path !== desiredPath) {
        existing.path = desiredPath;
        shouldSave = true;
      }

      if (shouldSave) {
        await repository.save(existing);
        return { entity: existing, outcome: 'updated' };
      }

      return { entity: existing, outcome: 'unchanged' };
    }

    const created = repository.create({
      name: spec.name,
      type: spec.type,
      parent: spec.parent ?? null,
      path: desiredPath,
    });
    await repository.save(created);
    return { entity: created, outcome: 'created' };
  }

  private async ensureDepartment(
    repository: Repository<Department>,
    spec: SeedDepartmentSpec,
  ): Promise<{ entity: Department; outcome: SeedOutcome }> {
    const parentId = spec.parent?.id ?? null;
    const existing = await repository.findOne({
      where: {
        name: spec.name,
        parent: parentId ? { id: parentId } : IsNull(),
      },
      relations: { parent: true, chief: true },
    });

    if (existing) {
      let shouldSave = false;
      if (existing.type !== spec.type) {
        existing.type = spec.type;
        shouldSave = true;
      }

      const existingParentId = existing.parent?.id ?? null;
      if (existingParentId !== parentId) {
        existing.parent = spec.parent ?? null;
        shouldSave = true;
      }

      if (shouldSave) {
        await repository.save(existing);
        return { entity: existing, outcome: 'updated' };
      }

      return { entity: existing, outcome: 'unchanged' };
    }

    const created = repository.create({
      name: spec.name,
      type: spec.type,
      parent: spec.parent ?? null,
    });
    await repository.save(created);
    return { entity: created, outcome: 'created' };
  }

  private async ensureUser(
    repository: Repository<User>,
    spec: SeedUserSpec,
    defaultPassword: string,
  ): Promise<SeedOutcome> {
    const existing = await repository.findOne({
      where: { email: spec.email },
      relations: { department: true, orgUnit: true },
    });

    if (existing) {
      let shouldSave = false;

      if (existing.role !== spec.role) {
        existing.role = spec.role;
        shouldSave = true;
      }

      const existingDepartmentId = existing.department?.id ?? null;
      const desiredDepartmentId = spec.department?.id ?? null;
      if (existingDepartmentId !== desiredDepartmentId) {
        existing.department = spec.department;
        shouldSave = true;
      }

      const existingOrgUnitId = existing.orgUnit?.id ?? null;
      const desiredOrgUnitId = spec.orgUnit?.id ?? null;
      if (existingOrgUnitId !== desiredOrgUnitId) {
        existing.orgUnit = spec.orgUnit;
        existing.orgUnitId = desiredOrgUnitId;
        shouldSave = true;
      }

      if (!existing.businessRole) {
        existing.businessRole = spec.businessRole;
        shouldSave = true;
      }

      if (!existing.isVerified) {
        existing.isVerified = true;
        shouldSave = true;
      }

      if (!existing.isActive) {
        existing.isActive = true;
        shouldSave = true;
      }

      if (shouldSave) {
        await repository.save(existing);
        return 'updated';
      }

      return 'unchanged';
    }

    const passwordHash = await this.hashingService.hash(defaultPassword);
    const created = repository.create({
      email: spec.email,
      name: spec.name,
      role: spec.role,
      department: spec.department ?? undefined,
      orgUnit: spec.orgUnit ?? undefined,
      orgUnitId: spec.orgUnit?.id ?? null,
      password: passwordHash,
      isVerified: true,
      isActive: true,
      permissions: [],
      businessRole: spec.businessRole,
    });
    await repository.save(created);
    return 'created';
  }

  private buildOrgUnitPath(name: string, parent: OrgUnit | null): string {
    const slug = this.slugify(name);
    if (!parent) {
      return slug;
    }
    const parentPath = parent.path ?? this.slugify(parent.name);
    return `${parentPath}.${slug}`;
  }

  private slugify(value: string): string {
    const cleaned = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return cleaned.length > 0 ? cleaned : 'unit';
  }

  private bump(
    bucket: { created: number; updated: number },
    outcome: SeedOutcome,
  ): void {
    if (outcome === 'created') {
      bucket.created += 1;
    } else if (outcome === 'updated') {
      bucket.updated += 1;
    }
  }
}
