import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Disaster } from '../disasters/entities/disaster.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { Task } from '../../task/entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Disaster, User, Department, Task])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
