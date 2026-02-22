import { ForbiddenException } from '@nestjs/common';
import { ScopeService } from './scope.service';
import { Role } from '../../users/enums/role.enum';
import { ActiveUserData } from '../interfaces/activate-user-data.interface';
import { Permission } from './permission.type';
import { Document } from '../../document/entities/document.entity';
import { FileEntity } from '../../files/entities/file.entity';
import { Task } from '../../task/entities/task.entity';
import { ScopeResolverService } from './scope-resolver.service';

function makeActor(
  role: Role,
  overrides: Partial<ActiveUserData> = {},
): ActiveUserData {
  return {
    sub: 100,
    email: 'actor@test.local',
    name: 'Actor',
    role,
    departmentId: 1,
    permissions: [Permission.FILES_READ],
    ...overrides,
  };
}

describe('ScopeService', () => {
  let service: ScopeService;

  beforeEach(() => {
    service = new ScopeService({
      canAccess: () => false,
    } as unknown as ScopeResolverService);
  });

  it('allows manager for document-file link inside own department', () => {
    const actor = makeActor(Role.Manager, { departmentId: 1 });
    const document = {
      id: 1,
      department: { id: 1 },
    } as Document;
    const file = {
      id: 1,
      owner: { id: 999 },
      department: { id: 1 },
    } as FileEntity;

    expect(() =>
      service.assertDocumentFileLinkScope(actor, document, file),
    ).not.toThrow();
  });

  it('throws when document in scope but file out of scope', () => {
    const actor = makeActor(Role.Manager, { departmentId: 1 });
    const document = {
      id: 1,
      department: { id: 1 },
    } as Document;
    const file = {
      id: 2,
      owner: { id: 777 },
      department: { id: 2 },
    } as FileEntity;

    expect(() =>
      service.assertDocumentFileLinkScope(actor, document, file),
    ).toThrow(ForbiddenException);
  });

  it('allows regular user for task-file link when owns both resources', () => {
    const actor = makeActor(Role.Regular, { sub: 10, departmentId: 1 });
    const task = {
      id: 7,
      creator: { id: 10, department: { id: 1 } },
      receiver: { id: 30, department: { id: 1 } },
    } as Task;
    const file = {
      id: 3,
      owner: { id: 10 },
      department: { id: 2 },
    } as FileEntity;

    expect(() =>
      service.assertTaskFileLinkScope(actor, task, file),
    ).not.toThrow();
  });
});
