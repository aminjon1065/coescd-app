import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { HashingService } from '../iam/hashing/hashing.service';
import { BcryptService } from '../iam/hashing/bcrypt.service';
import { ScopeService } from '../iam/authorization/scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
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
