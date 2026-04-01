import { Module } from '@nestjs/common';
import { TasksModule } from '../modules/tasks/tasks.module';

@Module({
  imports: [TasksModule],
  exports: [TasksModule],
})
export class TaskManagementModule {}
