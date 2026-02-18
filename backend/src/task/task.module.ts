import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { ScopeService } from '../iam/authorization/scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User])],
  controllers: [TaskController],
  providers: [TaskService, ScopeService],
  exports: [TypeOrmModule],
})
export class TaskModule {}
