import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { newDb } from 'pg-mem';
import * as cookieParser from 'cookie-parser';
import { IamModule } from '../src/iam/iam.module';
import { UsersModule } from '../src/users/users.module';
import { TaskModule } from '../src/task/task.module';
import { AnalyticsModule } from '../src/analytics/analytics.module';
import { User } from '../src/users/entities/user.entity';
import { Department } from '../src/department/entities/department.entity';
import { Role } from '../src/users/enums/role.enum';
import { DepartmentEnum } from '../src/department/enums/department.enum';
import { Task } from '../src/task/entities/task.entity';
import { AuthAuditLog } from '../src/iam/authentication/entities/auth-audit-log.entity';
import { Document } from '../src/document/entities/document.entity';
import { FileEntity } from '../src/files/entities/file.entity';
import { FileAccessAuditEntity } from '../src/files/entities/file-access-audit.entity';
import { UserChangeAuditLog } from '../src/users/entities/user-change-audit-log.entity';
import { RolePermissionProfile } from '../src/iam/authorization/entities/role-permission-profile.entity';
import { Disaster } from '../src/analytics/disasters/entities/disaster.entity';
import { DisasterType } from '../src/analytics/disasterTypes/entities/disaster-type.entity';
import { DisasterCategory } from '../src/analytics/disasterCategories/entities/category.entity';
import { EdmDocument } from '../src/edm/entities/edm-document.entity';
import { EdmDocumentRoute } from '../src/edm/entities/edm-document-route.entity';
import { EdmRouteStage } from '../src/edm/entities/edm-route-stage.entity';
import { EdmAlert } from '../src/edm/entities/edm-alert.entity';
import { EdmStageAction } from '../src/edm/entities/edm-stage-action.entity';
import { Permission } from '../src/iam/authorization/permission.type';

jest.setTimeout(30000);

const db = newDb({ autoCreateForeignKeyIndices: true });
db.public.registerFunction({
  name: 'current_database',
  implementation: () => 'pg_mem',
});
db.public.registerFunction({
  name: 'version',
  implementation: () => '14.0',
});

describe('Reports My Dashboard (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let departmentRepo: Repository<Department>;
  let taskRepo: Repository<Task>;
  let disasterRepo: Repository<Disaster>;
  let fileRepo: Repository<FileEntity>;
  let edmDocumentRepo: Repository<EdmDocument>;
  let edmRouteRepo: Repository<EdmDocumentRoute>;
  let edmStageRepo: Repository<EdmRouteStage>;
  let edmAlertRepo: Repository<EdmAlert>;

  let adminUser: User;
  let managerUser: User;
  let regularUser: User;
  let analystUser: User;
  let dept1: Department;
  let dept2: Department;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_TOKEN_AUDIENCE = 'test-audience';
    process.env.JWT_TOKEN_ISSUER = 'test-issuer';
    process.env.JWT_TOKEN_ACCESS_TOKEN_TTL = '3600';
    process.env.JWT_REFRESH_TOKEN_TTL = '86400';
    process.env.COOKIE_SECURE = 'false';
    process.env.COOKIE_SAMESITE = 'lax';
    process.env.REDIS_DISABLED = 'true';
    process.env.IAM_SEED_ENABLED = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            type: 'postgres',
            synchronize: true,
            autoLoadEntities: true,
            entities: [
              User,
              Department,
              Task,
              Document,
              FileEntity,
              FileAccessAuditEntity,
              UserChangeAuditLog,
              RolePermissionProfile,
              AuthAuditLog,
              Disaster,
              DisasterType,
              DisasterCategory,
              EdmDocument,
              EdmDocumentRoute,
              EdmRouteStage,
              EdmStageAction,
              EdmAlert,
            ],
          }),
          dataSourceFactory: async (options) => {
            const dataSource = db.adapters.createTypeormDataSource(options as any);
            return dataSource.initialize();
          },
        }),
        IamModule,
        UsersModule,
        TaskModule,
        AnalyticsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    departmentRepo = moduleFixture.get<Repository<Department>>(
      getRepositoryToken(Department),
    );
    taskRepo = moduleFixture.get<Repository<Task>>(getRepositoryToken(Task));
    disasterRepo = moduleFixture.get<Repository<Disaster>>(getRepositoryToken(Disaster));
    fileRepo = moduleFixture.get<Repository<FileEntity>>(getRepositoryToken(FileEntity));
    edmDocumentRepo = moduleFixture.get<Repository<EdmDocument>>(
      getRepositoryToken(EdmDocument),
    );
    edmRouteRepo = moduleFixture.get<Repository<EdmDocumentRoute>>(
      getRepositoryToken(EdmDocumentRoute),
    );
    edmStageRepo = moduleFixture.get<Repository<EdmRouteStage>>(
      getRepositoryToken(EdmRouteStage),
    );
    edmAlertRepo = moduleFixture.get<Repository<EdmAlert>>(getRepositoryToken(EdmAlert));

    await seedData();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function seedData() {
    dept1 = await departmentRepo.save(
      departmentRepo.create({ name: 'Reports Dept 1', type: DepartmentEnum.MAIN }),
    );
    dept2 = await departmentRepo.save(
      departmentRepo.create({ name: 'Reports Dept 2', type: DepartmentEnum.DIVISION }),
    );

    adminUser = await userRepo.save(
      userRepo.create({
        email: 'reports-admin@test.local',
        password: await bcrypt.hash('admin123', 10),
        name: 'Reports Admin',
        role: Role.Admin,
        permissions: [],
        department: dept1,
      }),
    );

    managerUser = await userRepo.save(
      userRepo.create({
        email: 'reports-manager@test.local',
        password: await bcrypt.hash('manager123', 10),
        name: 'Reports Manager',
        role: Role.Manager,
        permissions: [],
        department: dept1,
      }),
    );

    regularUser = await userRepo.save(
      userRepo.create({
        email: 'reports-regular@test.local',
        password: await bcrypt.hash('operator123', 10),
        name: 'Reports Regular',
        role: Role.Regular,
        permissions: [],
        department: dept1,
      }),
    );

    analystUser = await userRepo.save(
      userRepo.create({
        email: 'reports-analyst@test.local',
        password: await bcrypt.hash('analyst123', 10),
        name: 'Reports Analyst',
        role: Role.Regular,
        permissions: [Permission.ANALYTICS_WRITE, Permission.GIS_WRITE],
        department: dept1,
      }),
    );

    await taskRepo.save(
      taskRepo.create({
        title: 'Manager task',
        description: 'Task for manager',
        creator: managerUser,
        receiver: regularUser,
        status: 'in_progress',
      }),
    );
    await taskRepo.save(
      taskRepo.create({
        title: 'Regular task',
        description: 'Task for regular',
        creator: managerUser,
        receiver: regularUser,
        status: 'new',
      }),
    );

    const edmDocument = await edmDocumentRepo.save(
      edmDocumentRepo.create({
        type: 'internal',
        status: 'in_route',
        title: 'Reports EDM Doc',
        subject: 'Subject',
        summary: 'Summary',
        resolutionText: null,
        confidentiality: 'department_confidential',
        department: dept1,
        creator: managerUser,
        dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      }),
    );

    const route = await edmRouteRepo.save(
      edmRouteRepo.create({
        document: edmDocument,
        versionNo: 1,
        state: 'active',
        completionPolicy: 'sequential',
        createdBy: managerUser,
      }),
    );

    const stage = await edmStageRepo.save(
      edmStageRepo.create({
        route,
        orderNo: 1,
        stageType: 'review',
        assigneeType: 'user',
        assigneeUser: regularUser,
        assigneeRole: null,
        assigneeDepartment: null,
        state: 'in_progress',
        dueAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      }),
    );

    await edmAlertRepo.save(
      edmAlertRepo.create({
        document: edmDocument,
        stage,
        recipientUser: regularUser,
        kind: 'overdue',
        status: 'unread',
        message: 'Overdue alert',
        metadata: null,
      }),
    );

    await disasterRepo.save(
      disasterRepo.create({
        title: 'Flood Incident',
        description: 'Water level increase',
        location: 'Zone A',
        latitude: 40.1,
        longitude: 69.2,
        severity: 'critical',
        status: 'active',
        department: dept1,
        casualties: 0,
        affectedPeople: 10,
      }),
    );

    await fileRepo.save(
      fileRepo.create({
        originalName: 'report.pdf',
        storageKey: 'reports/test/report.pdf',
        bucket: 'test-bucket',
        mimeType: 'application/pdf',
        sizeBytes: '1024',
        checksumSha256: 'abc123',
        owner: managerUser,
        department: dept1,
        status: 'active',
      }),
    );
  }

  async function signIn(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/authentication/sign-in')
      .send({ email, password })
      .expect(200);
    return response.body.accessToken as string;
  }

  it('returns global dashboard for admin', async () => {
    const token = await signIn('reports-admin@test.local', 'admin123');
    const response = await request(app.getHttpServer())
      .get('/reports/my-dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.scope).toBe('global');
    expect(response.body.actor.role).toBe(Role.Admin);
    expect(response.body.widgets.admin).toBeDefined();
    expect(response.body.widgets.analytics).toBeDefined();
  });

  it('returns department dashboard for manager', async () => {
    const token = await signIn('reports-manager@test.local', 'manager123');
    const response = await request(app.getHttpServer())
      .get('/reports/my-dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.scope).toBe('department');
    expect(response.body.actor.departmentId).toBe(dept1.id);
    expect(response.body.widgets.department).toBeDefined();
    expect(response.body.widgets.admin).toBeUndefined();
  });

  it('returns self dashboard for regular employee', async () => {
    const token = await signIn('reports-regular@test.local', 'operator123');
    const response = await request(app.getHttpServer())
      .get('/reports/my-dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.scope).toBe('self');
    expect(response.body.actor.role).toBe(Role.Regular);
    expect(response.body.widgets.admin).toBeUndefined();
    expect(response.body.widgets.department).toBeUndefined();
    expect(response.body.widgets.edm.myUnreadAlerts).toBeGreaterThanOrEqual(1);
  });

  it('includes analytics widget for analyst user with custom permissions', async () => {
    const token = await signIn('reports-analyst@test.local', 'analyst123');
    const response = await request(app.getHttpServer())
      .get('/reports/my-dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.actor.isAnalyst).toBe(true);
    expect(response.body.widgets.analytics).toBeDefined();
    expect(response.body.widgets.analytics.criticalDisasters).toBeGreaterThanOrEqual(0);
  });
});
