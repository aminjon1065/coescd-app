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
import { DocumentModule } from '../src/document/document.module';
import { TaskModule } from '../src/task/task.module';
import { FilesModule } from '../src/files/files.module';
import { User } from '../src/users/entities/user.entity';
import { Department } from '../src/department/entities/department.entity';
import { Task } from '../src/task/entities/task.entity';
import { Document } from '../src/document/entities/document.entity';
import { FileEntity } from '../src/files/entities/file.entity';
import { FileAccessAuditEntity } from '../src/files/entities/file-access-audit.entity';
import { UserChangeAuditLog } from '../src/users/entities/user-change-audit-log.entity';
import { Role } from '../src/users/enums/role.enum';
import { DepartmentEnum } from '../src/department/enums/department.enum';
import { FilesStorageService } from '../src/files/storage/files-storage.service';
import { Readable } from 'stream';

const db = newDb({ autoCreateForeignKeyIndices: true });
db.public.registerFunction({
  name: 'current_database',
  implementation: () => 'pg_mem',
});
db.public.registerFunction({
  name: 'version',
  implementation: () => '14.0',
});

describe('RBAC + ABAC (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let departmentRepo: Repository<Department>;
  let taskRepo: Repository<Task>;
  let documentRepo: Repository<Document>;
  let fileRepo: Repository<FileEntity>;
  let fileAuditRepo: Repository<FileAccessAuditEntity>;
  let userChangeAuditRepo: Repository<UserChangeAuditLog>;

  let adminUser: User;
  let managerDept1: User;
  let regularDept1: User;
  let regularDept2: User;
  let lockoutUser: User;
  let taskDept1: Task;
  let taskDept2: Task;
  let documentDept1: Document;
  let documentDept2: Document;
  let fileDept2: FileEntity;

  const objectStore = new Map<string, { body: Buffer; mimeType: string }>();
  const filesStorageMock: Partial<FilesStorageService> = {
    getBucket: () => 'test-files',
    uploadObject: async (params: {
      key: string;
      body: Buffer;
      mimeType: string;
    }) => {
      objectStore.set(params.key, {
        body: params.body,
        mimeType: params.mimeType,
      });
    },
    getObjectStream: async (key: string) => {
      const stored = objectStore.get(key);
      if (!stored) {
        throw new Error('File stream is unavailable');
      }
      return Readable.from(stored.body);
    },
    deleteObject: async (key: string) => {
      objectStore.delete(key);
    },
    getPresignedUploadUrl: async (params: {
      key: string;
      mimeType: string;
      expiresInSeconds: number;
    }) =>
      `https://signed.test/upload/${encodeURIComponent(params.key)}?ttl=${params.expiresInSeconds}`,
    getPresignedDownloadUrl: async (params: {
      key: string;
      originalName: string;
      mimeType: string;
      expiresInSeconds: number;
    }) =>
      `https://signed.test/download/${encodeURIComponent(params.key)}?ttl=${params.expiresInSeconds}`,
    getObjectMetadata: async (key: string) => {
      const stored = objectStore.get(key);
      if (!stored) {
        throw new Error('not found');
      }
      return {
        contentLength: stored.body.byteLength,
        contentType: stored.mimeType,
      };
    },
  };

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
    process.env.AUTH_SIGNIN_MAX_ATTEMPTS = '3';
    process.env.AUTH_SIGNIN_WINDOW_SECONDS = '300';
    process.env.AUTH_SIGNIN_LOCKOUT_SECONDS = '900';
    process.env.AUTH_REFRESH_MAX_ATTEMPTS = '2';
    process.env.AUTH_REFRESH_WINDOW_SECONDS = '60';
    process.env.FILES_UPLOAD_MAX_BYTES = '1048576';
    process.env.FILES_ALLOWED_MIME_TYPES =
      'text/plain,application/pdf,application/octet-stream';
    process.env.FILES_PRESIGNED_ENABLED = 'true';
    process.env.FILES_PRESIGNED_UPLOAD_TTL_SECONDS = '120';
    process.env.FILES_PRESIGNED_DOWNLOAD_TTL_SECONDS = '90';

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
              Task,
              Document,
              FileEntity,
              UserChangeAuditLog,
            ],
          }),
          dataSourceFactory: async (options) => {
            const dataSource = db.adapters.createTypeormDataSource(
              options as any,
            );
            return dataSource.initialize();
          },
        }),
        IamModule,
        UsersModule,
        DocumentModule,
        TaskModule,
        FilesModule,
      ],
    })
      .overrideProvider(FilesStorageService)
      .useValue(filesStorageMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    departmentRepo = moduleFixture.get<Repository<Department>>(
      getRepositoryToken(Department),
    );
    taskRepo = moduleFixture.get<Repository<Task>>(getRepositoryToken(Task));
    documentRepo = moduleFixture.get<Repository<Document>>(
      getRepositoryToken(Document),
    );
    fileRepo = moduleFixture.get<Repository<FileEntity>>(
      getRepositoryToken(FileEntity),
    );
    fileAuditRepo = moduleFixture.get<Repository<FileAccessAuditEntity>>(
      getRepositoryToken(FileAccessAuditEntity),
    );
    userChangeAuditRepo = moduleFixture.get<Repository<UserChangeAuditLog>>(
      getRepositoryToken(UserChangeAuditLog),
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
    lockoutUser = await userRepo.save(
      userRepo.create({
        email: 'lockout@test.local',
        password: regularPassword,
        name: 'Lockout User',
        role: Role.Regular,
        permissions: [],
        department: dept1,
      }),
    );

    taskDept1 = await taskRepo.save(
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

    documentDept1 = await documentRepo.save(
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

    const key = 'local/2/2026/02/e2e-file-dept2.txt';
    objectStore.set(key, {
      body: Buffer.from('dept2-file-content'),
      mimeType: 'text/plain',
    });
    fileDept2 = await fileRepo.save(
      fileRepo.create({
        originalName: 'dept2.txt',
        storageKey: key,
        bucket: 'test-files',
        mimeType: 'text/plain',
        sizeBytes: String(Buffer.byteLength('dept2-file-content')),
        checksumSha256: 'a'.repeat(64),
        owner: regularDept2,
        department: dept2,
        status: 'active',
        deletedAt: null,
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

  function getListItems<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
      return payload as T[];
    }
    if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { items?: unknown[] }).items)
    ) {
      return (payload as { items: T[] }).items;
    }
    return [];
  }

  function getCookieValue(setCookie: string[], name: string): string | null {
    const target = setCookie.find((cookie) => cookie.startsWith(`${name}=`));
    if (!target) {
      return null;
    }
    return target.split(';')[0].split('=')[1] ?? null;
  }

  function normalizeSetCookieHeader(
    setCookieHeader: string | string[] | undefined,
  ): string[] {
    if (!setCookieHeader) {
      return [];
    }
    return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  }

  function toCookieHeader(setCookie: string[]): string {
    return setCookie.map((cookie) => cookie.split(';')[0]).join('; ');
  }

  async function signInWithSession(
    email: string,
    password: string,
    ip?: string,
  ): Promise<{ accessToken: string; csrfToken: string; cookieHeader: string }> {
    let req = request(app.getHttpServer())
      .post('/authentication/sign-in')
      .send({ email, password });
    if (ip) {
      req = req.set('x-forwarded-for', ip);
    }
    const response = await req.expect(200);
    const setCookie = normalizeSetCookieHeader(response.headers['set-cookie']);
    const csrfToken = getCookieValue(setCookie, 'csrfToken');
    if (!csrfToken) {
      throw new Error('csrfToken cookie missing');
    }
    return {
      accessToken: response.body.accessToken as string,
      csrfToken,
      cookieHeader: toCookieHeader(setCookie),
    };
  }

  async function createManagerOwnedFile(managerToken: string): Promise<number> {
    const uploadUrlResponse = await request(app.getHttpServer())
      .post('/files/upload-url')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        originalName: 'doc-link-file.txt',
        mimeType: 'text/plain',
        sizeBytes: 21,
      })
      .expect(201);

    const key: string = uploadUrlResponse.body.key;
    const payload = Buffer.from('document link payload');
    objectStore.set(key, {
      body: payload,
      mimeType: 'text/plain',
    });

    const completeResponse = await request(app.getHttpServer())
      .post('/files/upload-complete')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        key,
        originalName: 'doc-link-file.txt',
        mimeType: 'text/plain',
        sizeBytes: payload.byteLength,
        checksumSha256: 'd'.repeat(64),
      })
      .expect(201);

    return completeResponse.body.id as number;
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
    expect(
      getListItems<User>(usersRes.body).some(
        (u: User) => u.id === regularDept2.id,
      ),
    ).toBe(false);

    const documentsRes = await request(app.getHttpServer())
      .get('/documents')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(
      getListItems<Document>(documentsRes.body).some(
        (d: Document) => d.id === documentDept2.id,
      ),
    ).toBe(false);

    const tasksRes = await request(app.getHttpServer())
      .get('/task')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(
      getListItems<Task>(tasksRes.body).some(
        (t: Task) => t.id === taskDept2.id,
      ),
    ).toBe(false);
  });

  it('users bulk import: dry-run and apply are idempotent', async () => {
    const adminToken = await signIn('admin@test.local', 'admin123');
    const csv = [
      'email,name,role,password,position,department_name,is_active,permissions',
      'bulk.new@test.local,Bulk New,regular,bulkpass123,Operator,Dept 1,true,users.read',
      'lockout@test.local,Lockout User Updated,regular,,Field Operator,Dept 1,true,"documents.read,tasks.read"',
    ].join('\n');

    const dryRunResponse = await request(app.getHttpServer())
      .post('/users/bulk-import/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('mode', 'upsert')
      .field('allowRoleUpdate', 'true')
      .field('allowPermissionUpdate', 'true')
      .attach('file', Buffer.from(csv, 'utf8'), {
        filename: 'users-import.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(dryRunResponse.body.sessionId).toBeDefined();
    expect(dryRunResponse.body.summary.invalidRows).toBe(0);
    expect(dryRunResponse.body.summary.toCreate).toBe(1);
    expect(dryRunResponse.body.summary.toUpdate).toBeGreaterThanOrEqual(1);

    const idempotencyKey = `idem-${Date.now()}`;
    const applyPayload = {
      sessionId: dryRunResponse.body.sessionId as string,
      idempotencyKey,
      confirm: true,
    };

    const applyResponse = await request(app.getHttpServer())
      .post('/users/bulk-import/apply')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(applyPayload)
      .expect(200);

    const applyReplayResponse = await request(app.getHttpServer())
      .post('/users/bulk-import/apply')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(applyPayload)
      .expect(200);

    expect(applyReplayResponse.body.operationId).toBe(
      applyResponse.body.operationId,
    );
    expect(applyReplayResponse.body.summary).toEqual(
      applyResponse.body.summary,
    );

    const createdUser = await userRepo.findOne({
      where: { email: 'bulk.new@test.local' },
      relations: { department: true },
    });
    expect(createdUser).toBeDefined();
    expect(createdUser?.department?.name).toBe('Dept 1');

    const updatedUser = await userRepo.findOne({
      where: { email: 'lockout@test.local' },
      relations: { department: true },
    });
    expect(updatedUser?.name).toBe('Lockout User Updated');
    expect(updatedUser?.role).toBe(Role.Regular);

    const auditLogs = await userChangeAuditRepo.find({
      where: { reason: 'bulk-import' },
      relations: { actor: true, targetUser: true },
    });
    expect(
      auditLogs.some(
        (log) =>
          log.actor?.id === adminUser.id &&
          log.action === 'user.create' &&
          log.targetUser?.email === 'bulk.new@test.local',
      ),
    ).toBe(true);
    expect(
      auditLogs.some(
        (log) =>
          log.actor?.id === adminUser.id &&
          log.action === 'user.update' &&
          log.targetUser?.email === 'lockout@test.local',
      ),
    ).toBe(true);
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

  it('authorization matrix endpoint is available only for admin', async () => {
    const adminToken = await signIn('admin@test.local', 'admin123');
    const regularToken = await signIn('regular1@test.local', 'operator123');

    const adminResponse = await request(app.getHttpServer())
      .get('/iam/authorization/matrix')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(adminResponse.body.permissions).toBeInstanceOf(Array);
    expect(adminResponse.body.rolePermissions?.admin).toBeInstanceOf(Array);
    expect(adminResponse.body.rolePermissions?.manager).toBeInstanceOf(Array);
    expect(adminResponse.body.rolePermissions?.regular).toBeInstanceOf(Array);

    await request(app.getHttpServer())
      .get('/iam/authorization/matrix')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('files: manager can request upload-url and regular cannot', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');
    const regularToken = await signIn('regular1@test.local', 'operator123');

    const uploadUrlResponse = await request(app.getHttpServer())
      .post('/files/upload-url')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        originalName: 'manager.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
      })
      .expect(201);

    expect(uploadUrlResponse.body.key).toBeDefined();
    expect(uploadUrlResponse.body.uploadUrl).toContain(
      'https://signed.test/upload/',
    );

    await request(app.getHttpServer())
      .post('/files/upload-url')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        originalName: 'regular.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
      })
      .expect(403);
  });

  it('files: upload endpoint enforces permissions and payload validation', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');
    const regularToken = await signIn('regular1@test.local', 'operator123');

    await request(app.getHttpServer())
      .post('/files/upload')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .post('/files/upload')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('files: regular cannot read foreign department file and admin can', async () => {
    const regularToken = await signIn('regular1@test.local', 'operator123');
    const adminToken = await signIn('admin@test.local', 'admin123');

    await request(app.getHttpServer())
      .get(`/files/${fileDept2.id}`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/files/${fileDept2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('files: presigned upload + complete + download-url work for manager', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');

    const uploadUrlResponse = await request(app.getHttpServer())
      .post('/files/upload-url')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        originalName: 'direct-upload.txt',
        mimeType: 'text/plain',
        sizeBytes: 17,
      })
      .expect(201);

    expect(uploadUrlResponse.body.uploadUrl).toContain(
      'https://signed.test/upload/',
    );
    const key: string = uploadUrlResponse.body.key;
    objectStore.set(key, {
      body: Buffer.from('direct upload data'),
      mimeType: 'text/plain',
    });

    const completeResponse = await request(app.getHttpServer())
      .post('/files/upload-complete')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        key,
        originalName: 'direct-upload.txt',
        mimeType: 'text/plain',
        sizeBytes: 18,
        checksumSha256: 'b'.repeat(64),
      })
      .expect(201);

    const fileId = completeResponse.body.id as number;
    expect(fileId).toBeDefined();

    const signedDownloadResponse = await request(app.getHttpServer())
      .get(`/files/${fileId}/download-url`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(signedDownloadResponse.body.downloadUrl).toContain(
      'https://signed.test/download/',
    );
  });

  it('files: upload-url validates mime whitelist and size limit', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');

    await request(app.getHttpServer())
      .post('/files/upload-url')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        originalName: 'bad.bin',
        mimeType: 'image/gif',
        sizeBytes: 32,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/files/upload-url')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        originalName: 'big.txt',
        mimeType: 'text/plain',
        sizeBytes: 2_000_000,
      })
      .expect(400);
  });

  it('documents/files: manager can link, list and unlink same-department file', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');
    const fileId = await createManagerOwnedFile(managerToken);

    await request(app.getHttpServer())
      .post(`/documents/${documentDept1.id}/files/${fileId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-forwarded-for', '61.61.61.61')
      .set('user-agent', 'e2e-doc-file-link')
      .expect(201);

    const listAfterLink = await request(app.getHttpServer())
      .get(`/documents/${documentDept1.id}/files`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(
      listAfterLink.body.some((file: FileEntity) => file.id === fileId),
    ).toBe(true);

    await request(app.getHttpServer())
      .delete(`/documents/${documentDept1.id}/files/${fileId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-forwarded-for', '62.62.62.62')
      .set('user-agent', 'e2e-doc-file-unlink')
      .expect(200);

    const listAfterUnlink = await request(app.getHttpServer())
      .get(`/documents/${documentDept1.id}/files`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(
      listAfterUnlink.body.some((file: FileEntity) => file.id === fileId),
    ).toBe(false);

    const audits = await fileAuditRepo.find({
      where: {
        file: { id: fileId },
      },
      relations: {
        actor: true,
      },
    });
    const linkAudit = audits.find(
      (item) =>
        item.action === 'link' &&
        item.actor?.id === managerDept1.id &&
        item.reason === `document:${documentDept1.id}`,
    );
    const unlinkAudit = audits.find(
      (item) =>
        item.action === 'unlink' &&
        item.actor?.id === managerDept1.id &&
        item.reason === `document:${documentDept1.id}`,
    );

    expect(linkAudit).toBeDefined();
    expect(unlinkAudit).toBeDefined();
  });

  it('documents/files: regular cannot link files to documents', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');
    const regularToken = await signIn('regular1@test.local', 'operator123');
    const fileId = await createManagerOwnedFile(managerToken);

    await request(app.getHttpServer())
      .post(`/documents/${documentDept1.id}/files/${fileId}`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('documents/files: manager is blocked cross-department, admin is allowed', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');
    const adminToken = await signIn('admin@test.local', 'admin123');

    await request(app.getHttpServer())
      .post(`/documents/${documentDept2.id}/files/${fileDept2.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/documents/${documentDept2.id}/files/${fileDept2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const adminList = await request(app.getHttpServer())
      .get(`/documents/${documentDept2.id}/files`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      adminList.body.some((file: FileEntity) => file.id === fileDept2.id),
    ).toBe(true);
  });

  it('task/files: manager can link, list and unlink same-department file', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');
    const fileId = await createManagerOwnedFile(managerToken);

    await request(app.getHttpServer())
      .post(`/task/${taskDept1.id}/files/${fileId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-forwarded-for', '71.71.71.71')
      .set('user-agent', 'e2e-task-file-link')
      .expect(201);

    const listAfterLink = await request(app.getHttpServer())
      .get(`/task/${taskDept1.id}/files`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(
      listAfterLink.body.some((file: FileEntity) => file.id === fileId),
    ).toBe(true);

    await request(app.getHttpServer())
      .delete(`/task/${taskDept1.id}/files/${fileId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-forwarded-for', '72.72.72.72')
      .set('user-agent', 'e2e-task-file-unlink')
      .expect(200);

    const listAfterUnlink = await request(app.getHttpServer())
      .get(`/task/${taskDept1.id}/files`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(
      listAfterUnlink.body.some((file: FileEntity) => file.id === fileId),
    ).toBe(false);

    const audits = await fileAuditRepo.find({
      where: {
        file: { id: fileId },
      },
      relations: {
        actor: true,
      },
    });
    const linkAudit = audits.find(
      (item) =>
        item.action === 'link' &&
        item.actor?.id === managerDept1.id &&
        item.reason === `task:${taskDept1.id}`,
    );
    const unlinkAudit = audits.find(
      (item) =>
        item.action === 'unlink' &&
        item.actor?.id === managerDept1.id &&
        item.reason === `task:${taskDept1.id}`,
    );

    expect(linkAudit).toBeDefined();
    expect(unlinkAudit).toBeDefined();
  });

  it('task/files: regular cannot link files to tasks', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');
    const regularToken = await signIn('regular1@test.local', 'operator123');
    const fileId = await createManagerOwnedFile(managerToken);

    await request(app.getHttpServer())
      .post(`/task/${taskDept1.id}/files/${fileId}`)
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);
  });

  it('task/files: manager is blocked cross-department, admin is allowed', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');
    const adminToken = await signIn('admin@test.local', 'admin123');

    await request(app.getHttpServer())
      .post(`/task/${taskDept2.id}/files/${fileDept2.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/task/${taskDept2.id}/files/${fileDept2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const adminList = await request(app.getHttpServer())
      .get(`/task/${taskDept2.id}/files`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      adminList.body.some((file: FileEntity) => file.id === fileDept2.id),
    ).toBe(true);
  });

  it('files: creates audit entries for upload, download and delete', async () => {
    const managerToken = await signIn('manager1@test.local', 'manager123');
    const adminToken = await signIn('admin@test.local', 'admin123');

    const uploadUrlResponse = await request(app.getHttpServer())
      .post('/files/upload-url')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-forwarded-for', '55.55.55.55')
      .set('user-agent', 'e2e-audit-upload')
      .send({
        originalName: 'audit.txt',
        mimeType: 'text/plain',
        sizeBytes: 18,
      })
      .expect(201);

    const key: string = uploadUrlResponse.body.key;
    const auditPayload = Buffer.from('audit file content!');
    objectStore.set(key, {
      body: auditPayload,
      mimeType: 'text/plain',
    });

    const completeResponse = await request(app.getHttpServer())
      .post('/files/upload-complete')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-forwarded-for', '55.55.55.55')
      .set('user-agent', 'e2e-audit-upload')
      .send({
        key,
        originalName: 'audit.txt',
        mimeType: 'text/plain',
        sizeBytes: auditPayload.byteLength,
        checksumSha256: 'c'.repeat(64),
      })
      .expect(201);

    const fileId = completeResponse.body.id as number;

    await request(app.getHttpServer())
      .get(`/files/${fileId}/download`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-forwarded-for', '56.56.56.56')
      .set('user-agent', 'e2e-audit-download')
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/files/${fileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-forwarded-for', '57.57.57.57')
      .set('user-agent', 'e2e-audit-delete')
      .expect(200);

    const audits = await fileAuditRepo.find({
      where: {
        file: { id: fileId },
      },
      relations: {
        actor: true,
        file: true,
      },
    });

    expect(audits.length).toBeGreaterThanOrEqual(3);
    const uploadAudit = audits.find((item) => item.action === 'upload');
    const downloadAudit = audits.find((item) => item.action === 'download');
    const deleteAudit = audits.find((item) => item.action === 'delete');

    expect(uploadAudit).toBeDefined();
    expect(uploadAudit?.success).toBe(true);
    expect(uploadAudit?.actor?.id).toBe(managerDept1.id);

    expect(downloadAudit).toBeDefined();
    expect(downloadAudit?.success).toBe(true);
    expect(downloadAudit?.actor?.id).toBe(managerDept1.id);

    expect(deleteAudit).toBeDefined();
    expect(deleteAudit?.success).toBe(true);
    expect(deleteAudit?.actor?.id).toBe(adminUser.id);
  });

  it('change-password revokes refresh sessions and old password', async () => {
    const ip = '40.40.40.40';
    const session = await signInWithSession(
      'regular1@test.local',
      'operator123',
      ip,
    );

    await request(app.getHttpServer())
      .post('/authentication/change-password')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        currentPassword: 'operator123',
        newPassword: 'operator456',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/authentication/refresh-tokens')
      .set('x-forwarded-for', ip)
      .set('Cookie', session.cookieHeader)
      .set('x-csrf-token', session.csrfToken)
      .expect(401);

    await request(app.getHttpServer())
      .post('/authentication/sign-in')
      .send({ email: 'regular1@test.local', password: 'operator123' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/authentication/sign-in')
      .send({ email: 'regular1@test.local', password: 'operator456' })
      .expect(200);
  });

  it('logout-all-devices revokes refresh token', async () => {
    const ip = '41.41.41.41';
    const session = await signInWithSession('admin@test.local', 'admin123', ip);

    await request(app.getHttpServer())
      .post('/authentication/logout-all-devices')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/authentication/refresh-tokens')
      .set('x-forwarded-for', ip)
      .set('Cookie', session.cookieHeader)
      .set('x-csrf-token', session.csrfToken)
      .expect(401);
  });

  it('disabled user cannot sign in and loses API access', async () => {
    const regularSession = await signInWithSession(
      'regular2@test.local',
      'operator123',
      '42.42.42.42',
    );
    const adminToken = await signIn('admin@test.local', 'admin123');

    await request(app.getHttpServer())
      .patch(`/users/${regularDept2.id}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/authentication/sign-in')
      .send({ email: 'regular2@test.local', password: 'operator123' })
      .expect(403);

    await request(app.getHttpServer())
      .get('/task')
      .set('Authorization', `Bearer ${regularSession.accessToken}`)
      .expect(401);
  });

  it('rejects refresh without valid csrf token', async () => {
    const ip = '30.30.30.30';
    const session = await signInWithSession('admin@test.local', 'admin123', ip);

    await request(app.getHttpServer())
      .post('/authentication/refresh-tokens')
      .set('x-forwarded-for', ip)
      .set('Cookie', session.cookieHeader)
      .expect(403);

    await request(app.getHttpServer())
      .post('/authentication/refresh-tokens')
      .set('x-forwarded-for', ip)
      .set('Cookie', session.cookieHeader)
      .set('x-csrf-token', 'invalid-token')
      .expect(403);
  });

  it('allows refresh with valid csrf token', async () => {
    const ip = '31.31.31.31';
    const session = await signInWithSession('admin@test.local', 'admin123', ip);

    await request(app.getHttpServer())
      .post('/authentication/refresh-tokens')
      .set('x-forwarded-for', ip)
      .set('Cookie', session.cookieHeader)
      .set('x-csrf-token', session.csrfToken)
      .expect(200);
  });

  it('rejects logout without csrf and allows with csrf', async () => {
    const session = await signInWithSession('admin@test.local', 'admin123');

    await request(app.getHttpServer())
      .post('/authentication/logout')
      .set('Cookie', session.cookieHeader)
      .expect(403);

    await request(app.getHttpServer())
      .post('/authentication/logout')
      .set('Cookie', session.cookieHeader)
      .set('x-csrf-token', session.csrfToken)
      .expect(201);
  });

  it('locks sign-in after configured failed attempts', async () => {
    const ip = '10.10.10.10';

    await request(app.getHttpServer())
      .post('/authentication/sign-in')
      .set('x-forwarded-for', ip)
      .send({ email: lockoutUser.email, password: 'wrong-password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/authentication/sign-in')
      .set('x-forwarded-for', ip)
      .send({ email: lockoutUser.email, password: 'wrong-password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/authentication/sign-in')
      .set('x-forwarded-for', ip)
      .send({ email: lockoutUser.email, password: 'wrong-password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/authentication/sign-in')
      .set('x-forwarded-for', ip)
      .send({ email: lockoutUser.email, password: 'operator123' })
      .expect(429);
  });

  it('rate-limits refresh attempts per ip', async () => {
    const ip = '20.20.20.20';
    let session = await signInWithSession('admin@test.local', 'admin123', ip);

    let refreshResponse = await request(app.getHttpServer())
      .post('/authentication/refresh-tokens')
      .set('x-forwarded-for', ip)
      .set('Cookie', session.cookieHeader)
      .set('x-csrf-token', session.csrfToken)
      .expect(200);

    let setCookie = normalizeSetCookieHeader(
      refreshResponse.headers['set-cookie'],
    );
    session = {
      ...session,
      csrfToken: getCookieValue(setCookie, 'csrfToken') ?? session.csrfToken,
      cookieHeader: toCookieHeader(setCookie),
    };

    refreshResponse = await request(app.getHttpServer())
      .post('/authentication/refresh-tokens')
      .set('x-forwarded-for', ip)
      .set('Cookie', session.cookieHeader)
      .set('x-csrf-token', session.csrfToken)
      .expect(200);

    setCookie = normalizeSetCookieHeader(refreshResponse.headers['set-cookie']);
    session = {
      ...session,
      csrfToken: getCookieValue(setCookie, 'csrfToken') ?? session.csrfToken,
      cookieHeader: toCookieHeader(setCookie),
    };

    await request(app.getHttpServer())
      .post('/authentication/refresh-tokens')
      .set('x-forwarded-for', ip)
      .set('Cookie', session.cookieHeader)
      .set('x-csrf-token', session.csrfToken)
      .expect(429);
  });
});
