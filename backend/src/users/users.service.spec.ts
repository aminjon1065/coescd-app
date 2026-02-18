import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserChangeAuditLog } from './entities/user-change-audit-log.entity';
import { Department } from '../department/entities/department.entity';
import { HashingService } from '../iam/hashing/hashing.service';
import { ScopeService } from '../iam/authorization/scope.service';
import { RefreshTokenIdsStorage } from '../iam/authentication/refresh-token-ids.storage/refresh-token-ids.storage';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserChangeAuditLog),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Department),
          useValue: {},
        },
        {
          provide: HashingService,
          useValue: {},
        },
        {
          provide: ScopeService,
          useValue: {},
        },
        {
          provide: RefreshTokenIdsStorage,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
