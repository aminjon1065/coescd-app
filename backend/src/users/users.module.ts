import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { HashingService } from '../iam/hashing/hashing.service';
import { BcryptService } from '../iam/hashing/bcrypt.service';
import { ScopeService } from '../iam/authorization/scope.service';
import { IamModule } from '../iam/iam.module';
import { Department } from '../department/entities/department.entity';
import { UserChangeAuditLog } from './entities/user-change-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Department, UserChangeAuditLog]),
    IamModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: HashingService,
      useClass: BcryptService,
    },
    ScopeService,
  ],
})
export class UsersModule {}
