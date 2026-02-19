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
import { EdmModule } from '../src/edm/edm.module';
import { TaskModule } from '../src/task/task.module';
import { User } from '../src/users/entities/user.entity';
import { Department } from '../src/department/entities/department.entity';
import { Role } from '../src/users/enums/role.enum';
import { DepartmentEnum } from '../src/department/enums/department.enum';
import { EdmDocument } from '../src/edm/entities/edm-document.entity';
import { IamDelegation } from '../src/edm/entities/iam-delegation.entity';
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

describe('EDM (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let departmentRepo: Repository<Department>;
  let edmDocumentRepo: Repository<EdmDocument>;
  let delegationRepo: Repository<IamDelegation>;

  let adminUser: User;
  let managerDept1: User;
  let managerDept2: User;
  let regularDept1: User;
  let chairpersonUser: User;
  let firstDeputyUser: User;
  let departmentHeadUser: User;
  let divisionHeadDept1User: User;
  let divisionHeadDept2User: User;
  let chancelleryUser: User;
  let dept1Id: number;
  let dept2Id: number;

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
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            type: 'postgres',
            synchronize: true,
            autoLoadEntities: true,
            entities: [User, Department, EdmDocument],
          }),
          dataSourceFactory: async (options) => {
            const dataSource = db.adapters.createTypeormDataSource(options as any);
            return dataSource.initialize();
          },
        }),
        IamModule,
        UsersModule,
        TaskModule,
        EdmModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    departmentRepo = moduleFixture.get<Repository<Department>>(
      getRepositoryToken(Department),
    );
    edmDocumentRepo = moduleFixture.get<Repository<EdmDocument>>(
      getRepositoryToken(EdmDocument),
    );
    delegationRepo = moduleFixture.get<Repository<IamDelegation>>(
      getRepositoryToken(IamDelegation),
    );

    await seedTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedTestData() {
    const dept1 = await departmentRepo.save(
      departmentRepo.create({
        name: 'EDM Dept 1',
        type: DepartmentEnum.MAIN,
      }),
    );
    const dept2 = await departmentRepo.save(
      departmentRepo.create({
        name: 'EDM Dept 2',
        type: DepartmentEnum.DIVISION,
      }),
    );
    dept1Id = dept1.id;
    dept2Id = dept2.id;

    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const regularPassword = await bcrypt.hash('operator123', 10);

    adminUser = await userRepo.save(
      userRepo.create({
        email: 'edm-admin@test.local',
        password: adminPassword,
        name: 'EDM Admin',
        role: Role.Admin,
        permissions: [],
        department: dept1,
      }),
    );

    managerDept1 = await userRepo.save(
      userRepo.create({
        email: 'edm-manager1@test.local',
        password: managerPassword,
        name: 'EDM Manager 1',
        role: Role.Manager,
        permissions: [],
        department: dept1,
      }),
    );

    managerDept2 = await userRepo.save(
      userRepo.create({
        email: 'edm-manager2@test.local',
        password: managerPassword,
        name: 'EDM Manager 2',
        role: Role.Manager,
        permissions: [],
        department: dept2,
      }),
    );

    regularDept1 = await userRepo.save(
      userRepo.create({
        email: 'edm-regular1@test.local',
        password: regularPassword,
        name: 'EDM Regular 1',
        role: Role.Regular,
        permissions: [],
        department: dept1,
      }),
    );

    chairpersonUser = await userRepo.save(
      userRepo.create({
        email: 'edm-chairperson@test.local',
        password: managerPassword,
        name: 'EDM Chairperson',
        role: Role.Chairperson,
        permissions: [],
        department: dept1,
      }),
    );

    firstDeputyUser = await userRepo.save(
      userRepo.create({
        email: 'edm-first-deputy@test.local',
        password: managerPassword,
        name: 'EDM First Deputy',
        role: Role.FirstDeputy,
        permissions: [],
        department: dept1,
      }),
    );

    departmentHeadUser = await userRepo.save(
      userRepo.create({
        email: 'edm-department-head@test.local',
        password: managerPassword,
        name: 'EDM Department Head',
        role: Role.DepartmentHead,
        permissions: [],
        department: dept2,
      }),
    );

    divisionHeadDept1User = await userRepo.save(
      userRepo.create({
        email: 'edm-division-head1@test.local',
        password: managerPassword,
        name: 'EDM Division Head 1',
        role: Role.DivisionHead,
        permissions: [],
        department: dept1,
      }),
    );

    divisionHeadDept2User = await userRepo.save(
      userRepo.create({
        email: 'edm-division-head2@test.local',
        password: managerPassword,
        name: 'EDM Division Head 2',
        role: Role.DivisionHead,
        permissions: [],
        department: dept2,
      }),
    );

    chancelleryUser = await userRepo.save(
      userRepo.create({
        email: 'edm-chancellery@test.local',
        password: managerPassword,
        name: 'EDM Chancellery',
        role: Role.Chancellery,
        permissions: [],
        department: dept1,
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

  it('runs lifecycle draft -> in_route -> approved -> archived', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM lifecycle test',
        subject: 'Approval flow',
        summary: 'Lifecycle flow test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    const documentId = createResponse.body.id as number;
    expect(documentId).toBeDefined();
    expect(createResponse.body.status).toBe('draft');

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
          },
          {
            orderNo: 2,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUserId: managerDept1.id,
          },
        ],
      })
      .expect(201);

    const routeResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/route`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(routeResponse.body.state).toBe('active');
    expect(routeResponse.body.stages).toHaveLength(2);

    const stage1Id = routeResponse.body.stages[0].id as number;
    const stage2Id = routeResponse.body.stages[1].id as number;

    const regularDocResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(200);
    expect(regularDocResponse.body.id).toBe(documentId);

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/stages/${stage1Id}/actions`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        action: 'approved',
        commentText: 'Checked',
      })
      .expect(201);

    const managerApprovals = await request(app.getHttpServer())
      .get('/edm/queues/my-approvals')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(managerApprovals.body.items.some((item: { id: number }) => item.id === stage2Id)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/stages/${stage2Id}/actions`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        action: 'approved',
      })
      .expect(201);

    const approvedDoc = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(approvedDoc.body.status).toBe('approved');

    const archiveResponse = await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/archive`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);

    expect(archiveResponse.body.status).toBe('archived');
    expect(archiveResponse.body.archivedAt).toBeDefined();

    const auditResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/audit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(auditResponse.body.length).toBeGreaterThanOrEqual(2);
    expect(
      auditResponse.body.some(
        (entry: { action: string }) => entry.action === 'approved',
      ),
    ).toBe(true);
  });

  it('denies foreign department access for manager and allows admin', async () => {
    const managerDept2Token = await signIn('edm-manager2@test.local', 'manager123');
    const adminToken = await signIn('edm-admin@test.local', 'admin123');

    const dept1Document = await edmDocumentRepo.findOne({
      where: {
        title: 'EDM lifecycle test',
      },
      relations: {
        creator: true,
      },
    });

    expect(dept1Document).toBeDefined();

    await request(app.getHttpServer())
      .get(`/edm/documents/${dept1Document!.id}`)
      .set('Authorization', `Bearer ${managerDept2Token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/edm/documents/${dept1Document!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('regular cannot create or archive EDM documents', async () => {
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        type: 'internal',
        title: 'Regular should fail',
        confidentiality: 'public_internal',
        departmentId: dept1Id,
      })
      .expect(403);

    const existingDocument = await edmDocumentRepo.findOne({
      where: { title: 'EDM lifecycle test' },
    });

    await request(app.getHttpServer())
      .post(`/edm/documents/${existingDocument!.id}/archive`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('supports returned_for_revision and resubmit', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'order',
        title: 'EDM revision test',
        subject: 'Needs fixes',
        summary: 'Will be returned for revision',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    const documentId = createResponse.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
          },
        ],
      })
      .expect(201);

    const routeResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/route`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    const stageId = routeResponse.body.stages[0].id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/stages/${stageId}/actions`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        action: 'returned_for_revision',
        commentText: 'Please fix subject details',
      })
      .expect(201);

    const returnedDocument = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(returnedDocument.body.status).toBe('returned_for_revision');

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUserId: managerDept1.id,
          },
        ],
      })
      .expect(201);

    const resubmittedDocument = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(resubmittedDocument.body.status).toBe('in_route');
  });

  it('supports admin override force_approve and force_reject', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const adminToken = await signIn('edm-admin@test.local', 'admin123');

    const approveCandidate = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM override approve test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${approveCandidate.body.id}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${approveCandidate.body.id}/override`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        overrideAction: 'force_approve',
        reason: 'Emergency legal deadline',
      })
      .expect(201);

    const approvedByOverride = await request(app.getHttpServer())
      .get(`/edm/documents/${approveCandidate.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(approvedByOverride.body.status).toBe('approved');

    const rejectCandidate = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM override reject test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${rejectCandidate.body.id}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${rejectCandidate.body.id}/override`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        overrideAction: 'force_reject',
        reason: 'Policy violation',
      })
      .expect(201);

    const rejectedByOverride = await request(app.getHttpServer())
      .get(`/edm/documents/${rejectCandidate.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(rejectedByOverride.body.status).toBe('rejected');
  });

  it('allows override for department head creator and denies regular user', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const candidate = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM override forbidden test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${candidate.body.id}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${candidate.body.id}/override`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        overrideAction: 'force_approve',
        reason: 'Department head creator override',
      })
      .expect(201);

    const secondCandidate = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM override forbidden for regular test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${secondCandidate.body.id}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${secondCandidate.body.id}/override`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        overrideAction: 'force_reject',
        reason: 'Should not be allowed for regular',
      })
      .expect(403);
  });

  it('returns item in outbox for creator', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');

    const outboxResponse = await request(app.getHttpServer())
      .get('/edm/queues/outbox')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(outboxResponse.body.items.length).toBeGreaterThan(0);
    expect(
      outboxResponse.body.items.some(
        (item: { title: string }) => item.title === 'EDM lifecycle test',
      ),
    ).toBe(true);
  });

  it('allows delegated on-behalf stage action and records onBehalfOf in audit', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM delegation success test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    const documentId = createResponse.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUserId: managerDept1.id,
          },
        ],
      })
      .expect(201);

    const routeResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/route`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    const stageId = routeResponse.body.stages[0].id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/stages/${stageId}/actions`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        action: 'approved',
      })
      .expect(403);

    await delegationRepo.save(
      delegationRepo.create({
        delegatorUser: managerDept1,
        delegateUser: regularDept1,
        scopeType: 'global',
        scopeDepartment: null,
        permissionSubset: [Permission.DOCUMENTS_ROUTE_EXECUTE],
        validFrom: new Date(Date.now() - 60_000),
        validTo: new Date(Date.now() + 60 * 60 * 1000),
        status: 'active',
        createdBy: adminUser,
      }),
    );

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/stages/${stageId}/actions`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        action: 'approved',
      })
      .expect(201);

    const auditResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/audit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const delegatedAction = auditResponse.body.find(
      (entry: { action: string; actorUser?: { id: number }; onBehalfOfUser?: { id: number } }) =>
        entry.action === 'approved' &&
        entry.actorUser?.id === regularDept1.id &&
        entry.onBehalfOfUser?.id === managerDept1.id,
    );
    expect(delegatedAction).toBeDefined();
  });

  it('denies delegation when permission subset does not include route execute', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    await delegationRepo.update({}, { status: 'revoked' });

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM delegation denied test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const documentId = createResponse.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUserId: managerDept1.id,
          },
        ],
      })
      .expect(201);

    const routeResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/route`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    const stageId = routeResponse.body.stages[0].id as number;

    await delegationRepo.save(
      delegationRepo.create({
        delegatorUser: managerDept1,
        delegateUser: regularDept1,
        scopeType: 'global',
        scopeDepartment: null,
        permissionSubset: [Permission.DOCUMENTS_READ],
        validFrom: new Date(Date.now() - 60_000),
        validTo: new Date(Date.now() + 60 * 60 * 1000),
        status: 'active',
        createdBy: adminUser,
      }),
    );

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/stages/${stageId}/actions`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        action: 'approved',
      })
      .expect(403);
  });

  it('supports route templates CRUD and submit by routeTemplateId', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    await request(app.getHttpServer())
      .post('/edm/route-templates')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        name: 'Regular forbidden template',
        scopeType: 'department',
        departmentId: dept1Id,
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
          },
        ],
      })
      .expect(403);

    const createTemplateResponse = await request(app.getHttpServer())
      .post('/edm/route-templates')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Dept1 Approval Template',
        description: 'Template for route-template e2e',
        scopeType: 'department',
        departmentId: dept1Id,
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
            dueInHours: 6,
          },
          {
            orderNo: 2,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUserId: managerDept1.id,
          },
        ],
      })
      .expect(201);

    const templateId = createTemplateResponse.body.id as number;
    expect(templateId).toBeDefined();
    expect(createTemplateResponse.body.stages).toHaveLength(2);

    const listTemplatesResponse = await request(app.getHttpServer())
      .get('/edm/route-templates')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(
      listTemplatesResponse.body.some((template: { id: number }) => template.id === templateId),
    ).toBe(true);

    await request(app.getHttpServer())
      .patch(`/edm/route-templates/${templateId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Dept1 Approval Template Updated',
      })
      .expect(200);

    const createDocumentResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM template submit test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const documentId = createDocumentResponse.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        routeTemplateId: templateId,
        completionPolicy: 'sequential',
      })
      .expect(201);

    const routeResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/route`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(routeResponse.body.stages).toHaveLength(2);
    expect(routeResponse.body.stages[0].assigneeUser.id).toBe(regularDept1.id);

    await request(app.getHttpServer())
      .delete(`/edm/route-templates/${templateId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const deletedTemplateResponse = await request(app.getHttpServer())
      .get(`/edm/route-templates/${templateId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(404);
    expect(deletedTemplateResponse.body.statusCode).toBe(404);
  });

  it('supports registration journal with unique number and registration statuses', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'incoming',
        title: 'EDM registration test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const documentId = createResponse.body.id as number;

    const registerResponse = await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/register`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);
    expect(registerResponse.body.status).toBe('registered');
    expect(registerResponse.body.registrationNumber).toBeDefined();

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/register`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(409);

    const journalList = await request(app.getHttpServer())
      .get('/edm/registration-journal')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({ journalType: 'incoming', status: 'registered' })
      .expect(200);

    expect(journalList.body.items.length).toBeGreaterThan(0);
    expect(
      journalList.body.items.some(
        (item: { document: { id: number } }) => item.document.id === documentId,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .patch(`/edm/documents/${documentId}/registration-status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'cancelled' })
      .expect(200);

    const cancelledList = await request(app.getHttpServer())
      .get('/edm/registration-journal')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({ journalType: 'incoming', status: 'cancelled' })
      .expect(200);
    expect(
      cancelledList.body.items.some(
        (item: { document: { id: number }; status: string }) =>
          item.document.id === documentId && item.status === 'cancelled',
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .get('/edm/registration-journal')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('creates resolution tasks from document and tracks execution progress', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const adminToken = await signIn('edm-admin@test.local', 'admin123');

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM resolution-task test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const documentId = createResponse.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/resolution-tasks`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        resolutionText: 'Complete field checks and confirm report',
        tasks: [
          {
            title: 'Field check',
            description: 'Visit site and collect data',
            receiverId: regularDept1.id,
          },
          {
            title: 'Prepare summary',
            receiverId: managerDept1.id,
          },
        ],
      })
      .expect(201);

    const tasksResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/tasks`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(tasksResponse.body).toHaveLength(2);

    const firstTaskId = tasksResponse.body[0].id as number;
    await request(app.getHttpServer())
      .patch(`/task/${firstTaskId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'completed' })
      .expect(200);

    const progressResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/task-progress`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(progressResponse.body.total).toBe(2);
    expect(progressResponse.body.completed).toBe(1);
    expect(progressResponse.body.completionRate).toBe(50);

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/resolution-tasks`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        tasks: [
          {
            title: 'Cross-department task should fail',
            receiverId: managerDept2.id,
          },
        ],
      })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/resolution-tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tasks: [
          {
            title: 'Cross-department by admin',
            receiverId: managerDept2.id,
          },
        ],
      })
      .expect(201);
  });

  it('processes deadline alerts, supports my alerts and ack flow', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM alerts test',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const documentId = createResponse.body.id as number;

    const overdueDueAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
            dueAt: overdueDueAt,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/edm/alerts/process')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    const processResponse = await request(app.getHttpServer())
      .post('/edm/alerts/process')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);
    expect(processResponse.body.createdAlerts).toBeGreaterThan(0);

    const regularOverdueResponse = await request(app.getHttpServer())
      .get('/edm/alerts/my')
      .set('Authorization', `Bearer ${regularToken}`)
      .query({ kind: 'overdue', status: 'unread' })
      .expect(200);
    expect(
      regularOverdueResponse.body.items.some(
        (item: { document: { id: number }; kind: string }) =>
          item.document.id === documentId && item.kind === 'overdue',
      ),
    ).toBe(true);

    const managerEscalationResponse = await request(app.getHttpServer())
      .get('/edm/alerts/my')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({ kind: 'escalation', status: 'unread' })
      .expect(200);
    expect(
      managerEscalationResponse.body.items.some(
        (item: { document: { id: number }; kind: string }) =>
          item.document.id === documentId && item.kind === 'escalation',
      ),
    ).toBe(true);

    const alertId = regularOverdueResponse.body.items[0].id as number;
    await request(app.getHttpServer())
      .patch(`/edm/alerts/${alertId}/ack`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(200);

    const regularReadResponse = await request(app.getHttpServer())
      .get('/edm/alerts/my')
      .set('Authorization', `Bearer ${regularToken}`)
      .query({ kind: 'overdue', status: 'read' })
      .expect(200);
    expect(
      regularReadResponse.body.items.some((item: { id: number; status: string }) => {
        return item.id === alertId && item.status === 'read';
      }),
    ).toBe(true);
  });

  it('supports fast document search and saved filters per user', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const manager2Token = await signIn('edm-manager2@test.local', 'manager123');

    await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'Search internal target',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'order',
        title: 'Search order target',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    const createFilterResponse = await request(app.getHttpServer())
      .post('/edm/saved-filters')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Internal Drafts',
        scope: 'documents',
        isDefault: true,
        criteria: {
          type: 'internal',
          status: 'draft',
          departmentId: dept1Id,
          q: 'Search',
        },
      })
      .expect(201);
    const filterId = createFilterResponse.body.id as number;
    expect(filterId).toBeDefined();

    const listFiltersResponse = await request(app.getHttpServer())
      .get('/edm/saved-filters')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(
      listFiltersResponse.body.some((item: { id: number }) => item.id === filterId),
    ).toBe(true);

    const filteredDocsResponse = await request(app.getHttpServer())
      .get('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({ savedFilterId: filterId })
      .expect(200);
    expect(filteredDocsResponse.body.items.length).toBeGreaterThan(0);
    expect(
      filteredDocsResponse.body.items.every(
        (item: { type: string; status: string }) =>
          item.type === 'internal' && item.status === 'draft',
      ),
    ).toBe(true);

    const emptyByDate = await request(app.getHttpServer())
      .get('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({
        savedFilterId: filterId,
        fromDate: '2099-01-01T00:00:00.000Z',
      })
      .expect(200);
    expect(emptyByDate.body.items).toHaveLength(0);

    await request(app.getHttpServer())
      .patch(`/edm/saved-filters/${filterId}`)
      .set('Authorization', `Bearer ${manager2Token}`)
      .send({
        name: 'Should fail',
      })
      .expect(403);

    await request(app.getHttpServer())
      .get('/edm/documents')
      .set('Authorization', `Bearer ${manager2Token}`)
      .query({ savedFilterId: filterId })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/edm/saved-filters/${filterId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
  });

  it('supports document card templates and create by documentTemplateId', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const manager2Token = await signIn('edm-manager2@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    await request(app.getHttpServer())
      .post('/edm/document-templates')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        name: 'Regular forbidden template',
        documentType: 'internal',
        scopeType: 'department',
        departmentId: dept1Id,
        fields: [{ fieldKey: 'title', label: 'Title', isRequired: true }],
      })
      .expect(403);

    const createTemplateResponse = await request(app.getHttpServer())
      .post('/edm/document-templates')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Internal Card Template',
        description: 'Card template for internal memos',
        documentType: 'internal',
        scopeType: 'department',
        departmentId: dept1Id,
        fields: [
          { fieldKey: 'title', label: 'Title', isRequired: true, isReadonly: true, defaultValue: 'Template Title' },
          { fieldKey: 'summary', label: 'Summary', isRequired: true, defaultValue: 'Template summary default' },
          { fieldKey: 'confidentiality', label: 'Conf', defaultValue: 'department_confidential' },
          { fieldKey: 'type', label: 'Doc Type', defaultValue: 'internal', isReadonly: true },
        ],
      })
      .expect(201);
    const templateId = createTemplateResponse.body.id as number;
    expect(templateId).toBeDefined();
    expect(createTemplateResponse.body.fields.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .get(`/edm/document-templates/${templateId}`)
      .set('Authorization', `Bearer ${manager2Token}`)
      .expect(403);

    const createFromTemplateResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        documentTemplateId: templateId,
        departmentId: dept1Id,
        templateValues: {
          summary: 'Summary from template values',
        },
      })
      .expect(201);

    expect(createFromTemplateResponse.body.type).toBe('internal');
    expect(createFromTemplateResponse.body.title).toBe('Template Title');
    expect(createFromTemplateResponse.body.summary).toBe('Summary from template values');
    expect(createFromTemplateResponse.body.confidentiality).toBe(
      'department_confidential',
    );

    await request(app.getHttpServer())
      .patch(`/edm/document-templates/${templateId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Internal Card Template Updated',
      })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/edm/document-templates/${templateId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
  });

  it('provides SLA/overdue/workload reports with scope filtering', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const manager2Token = await signIn('edm-manager2@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM report baseline doc',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const documentId = createResponse.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
            dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/edm/reports/sla')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    const slaResponse = await request(app.getHttpServer())
      .get('/edm/reports/sla')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({
        fromDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        toDate: new Date().toISOString(),
      })
      .expect(200);
    expect(slaResponse.body.total).toBeGreaterThan(0);
    expect(Array.isArray(slaResponse.body.byDepartment)).toBe(true);

    const overdueResponse = await request(app.getHttpServer())
      .get('/edm/reports/overdue')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(overdueResponse.body.totalOverdue).toBeGreaterThan(0);
    expect(Array.isArray(overdueResponse.body.byDepartment)).toBe(true);

    const workloadResponse = await request(app.getHttpServer())
      .get('/edm/reports/workload')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(workloadResponse.body.totalActiveStages).toBeGreaterThan(0);
    expect(Array.isArray(workloadResponse.body.byManager)).toBe(true);

    const slaExportResponse = await request(app.getHttpServer())
      .get('/edm/reports/sla/export')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(String(slaExportResponse.headers['content-type'])).toContain('text/csv');
    expect(slaExportResponse.text).toContain('metric,value');

    const overdueExportResponse = await request(app.getHttpServer())
      .get('/edm/reports/overdue/export')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(overdueExportResponse.text).toContain('totalOverdue');

    const workloadExportResponse = await request(app.getHttpServer())
      .get('/edm/reports/workload/export')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(workloadExportResponse.text).toContain('totalActiveStages');

    const slaXlsxResponse = await request(app.getHttpServer())
      .get('/edm/reports/sla/export/xlsx')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(String(slaXlsxResponse.headers['content-type'])).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(String(slaXlsxResponse.headers['content-disposition'])).toContain('.xlsx');

    const overdueXlsxResponse = await request(app.getHttpServer())
      .get('/edm/reports/overdue/export/xlsx')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(String(overdueXlsxResponse.headers['content-type'])).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const workloadXlsxResponse = await request(app.getHttpServer())
      .get('/edm/reports/workload/export/xlsx')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(String(workloadXlsxResponse.headers['content-type'])).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const dashboardResponse = await request(app.getHttpServer())
      .get('/edm/reports/dashboard')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({ topManagers: 5 })
      .expect(200);
    expect(dashboardResponse.body.kpis.totalRoutes).toBeGreaterThan(0);
    expect(Array.isArray(dashboardResponse.body.charts.managerLoad)).toBe(true);
    expect(dashboardResponse.body.charts.managerLoad.length).toBeLessThanOrEqual(5);

    const foreignManagerReport = await request(app.getHttpServer())
      .get('/edm/reports/overdue')
      .set('Authorization', `Bearer ${manager2Token}`)
      .query({ departmentId: dept1Id })
      .expect(200);
    expect(foreignManagerReport.body.totalOverdue).toBe(0);

    await request(app.getHttpServer())
      .get('/edm/reports/dashboard')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('enforces alerts permissions matrix (admin/manager allow process, regular deny)', async () => {
    const adminToken = await signIn('edm-admin@test.local', 'admin123');
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM alerts matrix doc',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);

    const overdueDueAt = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    await request(app.getHttpServer())
      .post(`/edm/documents/${createResponse.body.id}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
            dueAt: overdueDueAt,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/edm/alerts/process')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/edm/alerts/process')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/edm/alerts/process')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const regularAlerts = await request(app.getHttpServer())
      .get('/edm/alerts/my')
      .set('Authorization', `Bearer ${regularToken}`)
      .query({ kind: 'overdue' })
      .expect(200);
    expect(regularAlerts.body.items.length).toBeGreaterThan(0);
  });

  it('enforces document template permissions matrix across roles', async () => {
    const adminToken = await signIn('edm-admin@test.local', 'admin123');
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const createdTemplate = await request(app.getHttpServer())
      .post('/edm/document-templates')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'EDM role-matrix template',
        documentType: 'internal',
        scopeType: 'department',
        departmentId: dept1Id,
        fields: [{ fieldKey: 'title', label: 'Title', isRequired: true }],
      })
      .expect(201);

    const templateId = createdTemplate.body.id as number;

    await request(app.getHttpServer())
      .get('/edm/document-templates')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/edm/document-templates/${templateId}`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/edm/document-templates/${templateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('enforces reports permissions matrix for list and export endpoints', async () => {
    const adminToken = await signIn('edm-admin@test.local', 'admin123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    await request(app.getHttpServer())
      .get('/edm/reports/sla')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const adminExport = await request(app.getHttpServer())
      .get('/edm/reports/sla/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(String(adminExport.headers['content-type'])).toContain('text/csv');

    await request(app.getHttpServer())
      .get('/edm/reports/sla')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/edm/reports/sla/export')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('stores full document trail for forwarding, responsible assignment and replies', async () => {
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');
    const regularToken = await signIn('edm-regular1@test.local', 'operator123');

    const createResponse = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'EDM history trail doc',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const documentId = createResponse.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        completionPolicy: 'sequential',
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUserId: regularDept1.id,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/forward`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        toUserId: regularDept1.id,
        commentText: 'Forward to execution',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/responsible`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        responsibleUserId: regularDept1.id,
        reason: 'Primary executor',
      })
      .expect(201);

    const replyResponse = await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/replies`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        messageText: 'Accepted for execution',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${documentId}/replies`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        messageText: 'Proceed and report back',
        parentReplyId: replyResponse.body.id,
        toUserId: regularDept1.id,
      })
      .expect(201);

    const repliesResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/replies`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(repliesResponse.body.length).toBeGreaterThanOrEqual(2);

    const historyResponse = await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/history`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const eventTypes = historyResponse.body.map(
      (event: { eventType: string }) => event.eventType,
    );
    expect(eventTypes).toContain('created');
    expect(eventTypes).toContain('forwarded');
    expect(eventTypes).toContain('responsible_assigned');
    expect(eventTypes).toContain('reply_sent');

    await request(app.getHttpServer())
      .get(`/edm/documents/${documentId}/history`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('enforces org routing matrix for new committee roles', async () => {
    const chairpersonToken = await signIn('edm-chairperson@test.local', 'manager123');
    const firstDeputyToken = await signIn('edm-first-deputy@test.local', 'manager123');
    const departmentHeadToken = await signIn('edm-department-head@test.local', 'manager123');
    const divisionHead1Token = await signIn('edm-division-head1@test.local', 'manager123');
    const chancelleryToken = await signIn('edm-chancellery@test.local', 'manager123');
    const managerToken = await signIn('edm-manager1@test.local', 'manager123');

    const chairDocument = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${chairpersonToken}`)
      .send({
        type: 'internal',
        title: 'Chairperson routing matrix doc',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const chairDocumentId = chairDocument.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${chairDocumentId}/forward`)
      .set('Authorization', `Bearer ${chairpersonToken}`)
      .send({ toUserId: firstDeputyUser.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${chairDocumentId}/forward`)
      .set('Authorization', `Bearer ${firstDeputyToken}`)
      .send({ toUserId: chairpersonUser.id })
      .expect(201);

    const managerDocument = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'Department head routing matrix doc',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const managerDocumentId = managerDocument.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${managerDocumentId}/forward`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ toUserId: departmentHeadUser.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${managerDocumentId}/forward`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ toUserId: divisionHeadDept2User.id })
      .expect(403);

    const divisionDocument = await request(app.getHttpServer())
      .post('/edm/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'internal',
        title: 'Division head routing matrix doc',
        confidentiality: 'department_confidential',
        departmentId: dept1Id,
      })
      .expect(201);
    const divisionDocumentId = divisionDocument.body.id as number;

    await request(app.getHttpServer())
      .post(`/edm/documents/${divisionDocumentId}/forward`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ toUserId: divisionHeadDept1User.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${divisionDocumentId}/forward`)
      .set('Authorization', `Bearer ${divisionHead1Token}`)
      .send({ toUserId: managerDept1.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${divisionDocumentId}/forward`)
      .set('Authorization', `Bearer ${divisionHead1Token}`)
      .send({ toUserId: divisionHeadDept2User.id })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/edm/documents/${divisionDocumentId}/forward`)
      .set('Authorization', `Bearer ${chancelleryToken}`)
      .send({ toUserId: divisionHeadDept2User.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${divisionDocumentId}/forward`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ toUserId: departmentHeadUser.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/edm/documents/${divisionDocumentId}/forward`)
      .set('Authorization', `Bearer ${departmentHeadToken}`)
      .send({ toUserId: managerDept1.id })
      .expect(201);
  });
});
