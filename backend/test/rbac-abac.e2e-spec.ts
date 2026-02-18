import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { newDb } from 'pg-mem';
import { IamModule } from '../src/iam/iam.module';
import { UsersModule } from '../src/users/users.module';
import { DocumentModule } from '../src/document/document.module';
import { TaskModule } from '../src/task/task.module';
import { User } from '../src/users/entities/user.entity';
import { Department } from '../src/department/entities/department.entity';
import { Task } from '../src/task/entities/task.entity';
import { Document } from '../src/document/entities/document.entity';
import { Role } from '../src/users/enums/role.enum';
import { DepartmentEnum } from '../src/department/enums/department.enum';

const db = newDb({ autoCreateForeignKeyIndices: true });
db.public.registerFunction({
  name: 'current_database',
  implementation: () => 'pg_mem',
});
db.public.registerFunction({
  name: 'version',
  implementation: () => '14.0',
});

jest.mock('pg', () => db.adapters.createPg());

describe('RBAC + ABAC (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let departmentRepo: Repository<Department>;
  let taskRepo: Repository<Task>;
  let documentRepo: Repository<Document>;

  let adminUser: User;
  let managerDept1: User;
  let regularDept1: User;
  let regularDept2: User;
  let taskDept2: Task;
  let documentDept2: Document;

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
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'test',
          password: 'test',
          database: 'test',
          synchronize: true,
          autoLoadEntities: true,
          entities: [User, Department, Task, Document],
        }),
        IamModule,
        UsersModule,
        DocumentModule,
        TaskModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    departmentRepo = moduleFixture.get<Repository<Department>>(
      getRepositoryToken(Department),
    );
    taskRepo = moduleFixture.get<Repository<Task>>(getRepositoryToken(Task));
    documentRepo = moduleFixture.get<Repository<Document>>(
      getRepositoryToken(Document),
    );

    await seedTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedTestData() {
    const dept1 = await departmentRepo.save(
      departmentRepo.create({
        name: 'Dept 1',
        type: DepartmentEnum.MAIN,
      }),
    );
    const dept2 = await departmentRepo.save(
      departmentRepo.create({
        name: 'Dept 2',
        type: DepartmentEnum.DIVISION,
      }),
    );

    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const regularPassword = await bcrypt.hash('operator123', 10);

    adminUser = await userRepo.save(
      userRepo.create({
        email: 'admin@test.local',
        password: adminPassword,
        name: 'Admin',
        role: Role.Admin,
        permissions: [],
        department: dept1,
      }),
    );
    managerDept1 = await userRepo.save(
      userRepo.create({
        email: 'manager1@test.local',
        password: managerPassword,
        name: 'Manager 1',
        role: Role.Manager,
        permissions: [],
        department: dept1,
      }),
    );
    regularDept1 = await userRepo.save(
      userRepo.create({
        email: 'regular1@test.local',
        password: regularPassword,
        name: 'Regular 1',
        role: Role.Regular,
        permissions: [],
        department: dept1,
      }),
    );
    regularDept2 = await userRepo.save(
      userRepo.create({
        email: 'regular2@test.local',
        password: regularPassword,
        name: 'Regular 2',
        role: Role.Regular,
        permissions: [],
        department: dept2,
      }),
    );

    await taskRepo.save(
      taskRepo.create({
        title: 'Task dept1',
        description: 'Task for dept1',
        creator: managerDept1,
        receiver: regularDept1,
      }),
    );
    taskDept2 = await taskRepo.save(
      taskRepo.create({
        title: 'Task dept2',
        description: 'Task for dept2',
        creator: regularDept2,
        receiver: regularDept2,
      }),
    );

    await documentRepo.save(
      documentRepo.create({
        title: 'Doc dept1',
        description: 'Doc for dept1',
        type: 'internal',
        status: 'draft',
        sender: managerDept1,
        receiver: regularDept1,
        department: dept1,
      }),
    );
    documentDept2 = await documentRepo.save(
      documentRepo.create({
        title: 'Doc dept2',
        description: 'Doc for dept2',
        type: 'internal',
        status: 'draft',
        sender: regularDept2,
        receiver: regularDept2,
        department: dept2,
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

  it('regular cannot update custom permissions', async () => {
    const regularToken = await signIn('regular1@test.local', 'operator123');

    await request(app.getHttpServer())
      .patch(`/users/${regularDept2.id}/permissions`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ permissions: ['users.read'] })
      .expect(403);
  });

  it('manager can read same-department user but not other department user', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');

    await request(app.getHttpServer())
      .get(`/users/${regularDept1.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/users/${regularDept2.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);
  });

  it('regular can read only self user profile', async () => {
    const adminToken = await signIn('admin@test.local', 'admin123');
    await request(app.getHttpServer())
      .patch(`/users/${regularDept1.id}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissions: ['users.read'] })
      .expect(200);

    const regularToken = await signIn('regular1@test.local', 'operator123');

    await request(app.getHttpServer())
      .get(`/users/${regularDept1.id}`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/users/${managerDept1.id}`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('manager list endpoints are scope-filtered', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');

    const usersRes = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(usersRes.body.some((u: User) => u.id === regularDept2.id)).toBe(
      false,
    );

    const documentsRes = await request(app.getHttpServer())
      .get('/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(
      documentsRes.body.some((d: Document) => d.id === documentDept2.id),
    ).toBe(false);

    const tasksRes = await request(app.getHttpServer())
      .get('/task')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(tasksRes.body.some((t: Task) => t.id === taskDept2.id)).toBe(false);
  });

  it('regular cannot access foreign document and task', async () => {
    const regularToken = await signIn('regular1@test.local', 'operator123');

    await request(app.getHttpServer())
      .get(`/documents/${documentDept2.id}`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/task/${taskDept2.id}`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('admin can access cross-department resources', async () => {
    const adminToken = await signIn('admin@test.local', 'admin123');

    await request(app.getHttpServer())
      .get(`/users/${regularDept2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/documents/${documentDept2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/task/${taskDept2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
