import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { User } from '../users/entities/user.entity';
import { DepartmentEnum } from './enums/department.enum';
import { IsNull } from 'typeorm';

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
    if (dto.parentId && !parent) {
      throw new NotFoundException('Parent department not found');
    }

    const chief = dto.chiefId
      ? await this.userRepository.findOneBy({ id: dto.chiefId })
      : null;
    if (dto.chiefId && !chief) {
      throw new NotFoundException('Chief user not found');
    }

    const department = new Department();
    department.name = dto.name;
    department.type = dto.type;
    department.parent = parent;
    department.chief = chief;

    // НЕ устанавливаем users вручную — они будут привязаны отдельно
    return await this.departmentRepository.save(department);
  }

  async findAll(type?: DepartmentEnum) {
    const where = type ? { type } : {};
    return this.departmentRepository.find({
      where,
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

  async findTree(): Promise<Department[]> {
    return this.departmentRepository.find({
      where: { parent: IsNull() },
      relations: {
        children: {
          children: true, // до второго уровня
        },
        chief: true,
      },
    });
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    const department = await this.departmentRepository.findOneBy({ id });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        department.parent = null;
      } else {
        if (dto.parentId === id) {
          throw new BadRequestException(
            'Department cannot be parent of itself',
          );
        }
        const parent = await this.departmentRepository.findOneBy({
          id: dto.parentId,
        });
        if (!parent) {
          throw new NotFoundException('Parent department not found');
        }
        department.parent = parent;
      }
    }

    if (dto.chiefId !== undefined) {
      if (dto.chiefId === null) {
        department.chief = null;
      } else {
        const chief = await this.userRepository.findOneBy({
          id: dto.chiefId,
        });
        if (!chief) {
          throw new NotFoundException('Chief user not found');
        }
        department.chief = chief;
      }
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
