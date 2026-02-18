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
import { OpsModule } from '../src/ops/ops.module';
import { User } from '../src/users/entities/user.entity';
import { Department } from '../src/department/entities/department.entity';
import { Role } from '../src/users/enums/role.enum';
import { DepartmentEnum } from '../src/department/enums/department.enum';
import { AuthAuditLog } from '../src/iam/authentication/entities/auth-audit-log.entity';
import { Document } from '../src/document/entities/document.entity';
import { Task } from '../src/task/entities/task.entity';
import { FileEntity } from '../src/files/entities/file.entity';
import { FileAccessAuditEntity } from '../src/files/entities/file-access-audit.entity';
import { UserChangeAuditLog } from '../src/users/entities/user-change-audit-log.entity';
import { RolePermissionProfile } from '../src/iam/authorization/entities/role-permission-profile.entity';

const db = newDb({ autoCreateForeignKeyIndices: true });
db.public.registerFunction({
  name: 'current_database',
  implementation: () => 'pg_mem',
});
db.public.registerFunction({
  name: 'version',
  implementation: () => '14.0',
});

describe('Ops (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let userRepo: Repository<User>;
  let departmentRepo: Repository<Department>;

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
    process.env.BACKUP_REQUIRED = 'true';
    process.env.BACKUP_MAX_AGE_HOURS = '26';
    process.env.BACKUP_LAST_SUCCESS_AT = new Date().toISOString();

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
            entities: [
              User,
              Department,
              Document,
              Task,
              FileEntity,
              FileAccessAuditEntity,
              UserChangeAuditLog,
              RolePermissionProfile,
              AuthAuditLog,
            ],
          }),
          dataSourceFactory: async (options) => {
            const dataSource = db.adapters.createTypeormDataSource(options as any);
            return dataSource.initialize();
          },
        }),
        IamModule,
        UsersModule,
        OpsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    departmentRepo = moduleFixture.get<Repository<Department>>(
      getRepositoryToken(Department),
    );

    const department = await departmentRepo.save(
      departmentRepo.create({
        name: 'Ops Dept',
        type: DepartmentEnum.MAIN,
      }),
    );

    await userRepo.save(
      userRepo.create({
        email: 'ops-admin@test.local',
        password: await bcrypt.hash('admin123', 10),
        name: 'Ops Admin',
        role: Role.Admin,
        permissions: [],
        department,
      }),
    );

    await userRepo.save(
      userRepo.create({
        email: 'ops-regular@test.local',
        password: await bcrypt.hash('operator123', 10),
        name: 'Ops Regular',
        role: Role.Regular,
        permissions: [],
        department,
      }),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function signIn(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/authentication/sign-in')
      .send({ email, password })
      .expect(200);

    return response.body.accessToken as string;
  }

  it('exposes liveness and readiness endpoints without auth', async () => {
    const liveResponse = await request(app.getHttpServer())
      .get('/ops/health/live')
      .expect(200);
    expect(liveResponse.body.status).toBe('ok');
    expect(typeof liveResponse.body.uptimeSeconds).toBe('number');

    const readyResponse = await request(app.getHttpServer())
      .get('/ops/health/ready')
      .expect(200);
    expect(readyResponse.body.status).toBe('ready');
    expect(readyResponse.body.checks.db).toBe('ok');
  });

  it('allows only admin to read ops metrics and backup status', async () => {
    const adminToken = await signIn('ops-admin@test.local', 'admin123');
    const regularToken = await signIn('ops-regular@test.local', 'operator123');

    await request(app.getHttpServer())
      .get('/ops/metrics')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    const metricsResponse = await request(app.getHttpServer())
      .get('/ops/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(metricsResponse.body.process).toBeDefined();
    expect(metricsResponse.body.alerts.httpErrorRateSpike).toBeDefined();
    expect(metricsResponse.body.alerts.highHeapUsage).toBeDefined();

    await request(app.getHttpServer())
      .get('/ops/backup/status')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    const backupResponse = await request(app.getHttpServer())
      .get('/ops/backup/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(backupResponse.body.required).toBe(true);
    expect(backupResponse.body.lastSuccessAt).toBeDefined();
  });
});
