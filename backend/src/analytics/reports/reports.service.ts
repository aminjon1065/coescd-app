import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Disaster } from '../disasters/entities/disaster.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { Task } from '../../task/entities/task.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Disaster)
    private readonly disasterRepo: Repository<Disaster>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async getStats() {
    const [totalDisasters, activeDisasters, totalUsers, totalDepartments, totalTasks, activeTasks] =
      await Promise.all([
        this.disasterRepo.count(),
        this.disasterRepo.count({ where: { status: 'active' } }),
        this.userRepo.count(),
        this.departmentRepo.count(),
        this.taskRepo.count(),
        this.taskRepo.count({ where: { status: 'in_progress' } }),
      ]);

    return {
      totalDisasters,
      activeDisasters,
      totalUsers,
      totalDepartments,
      totalTasks,
      activeTasks,
    };
  }
}
