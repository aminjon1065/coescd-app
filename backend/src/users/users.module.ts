import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { HashingService } from '../iam/hashing/hashing.service';
import { BcryptService } from '../iam/hashing/bcrypt.service';
import { IamModule } from '../iam/iam.module';
import { Department } from '../department/entities/department.entity';
import { UserChangeAuditLog } from './entities/user-change-audit-log.entity';
import { UsersBulkImportService } from './bulk-import/users-bulk-import.service';
import { UsersBulkImportStorage } from './bulk-import/users-bulk-import.storage';
import { BulkImportOperation } from './entities/bulk-import-operation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Department,
      UserChangeAuditLog,
      BulkImportOperation,
    ]),
    IamModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: HashingService,
      useClass: BcryptService,
    },
    UsersBulkImportStorage,
    UsersBulkImportService,
  ],
})
export class UsersModule {}
