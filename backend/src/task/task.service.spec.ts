import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { ScopeService } from '../iam/authorization/scope.service';
import { FileAttachmentsService } from '../files/file-attachments.service';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: ScopeService,
          useValue: {},
        },
        {
          provide: FileAttachmentsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
