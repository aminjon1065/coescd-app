import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const parent = dto.parentId
      ? await this.departmentRepository.findOneBy({ id: dto.parentId })
      : null;

    const chief = dto.chiefId
      ? await this.userRepository.findOneBy({ id: dto.chiefId })
      : null;

    const department = new Department();
    department.name = dto.name;
    department.type = dto.type;
    department.parent = parent;
    department.chief = chief;

    // НЕ устанавливаем users вручную — они будут привязаны отдельно
    return this.departmentRepository.save(department);
  }

  async findAll() {
    return this.departmentRepository.find({
      relations: ['parent', 'chief', 'children'],
    });
  }

  async findOne(id: number) {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['parent', 'chief', 'children'],
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    const department = await this.departmentRepository.findOneBy({ id });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (dto.parentId) {
      department.parent = await this.departmentRepository.findOneBy({
        id: dto.parentId,
      });
    }

    if (dto.chiefId) {
      department.chief = await this.userRepository.findOneBy({
        id: dto.chiefId,
      });
    }

    department.name = dto.name ?? department.name;
    department.type = dto.type ?? department.type;

    return this.departmentRepository.save(department);
  }

  async remove(id: number) {
    const department = await this.departmentRepository.findOneBy({ id });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return this.departmentRepository.remove(department);
  }
}
