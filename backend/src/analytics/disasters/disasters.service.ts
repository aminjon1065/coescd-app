import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Disaster } from './entities/disaster.entity';
import { DisasterType } from '../disasterTypes/entities/disaster-type.entity';
import { Department } from '../../department/entities/department.entity';
import { CreateDisasterDto } from './dto/create-disaster.dto';
import { UpdateDisasterDto } from './dto/update-disaster.dto';
import { GetDisastersQueryDto } from './dto/get-disasters-query.dto';
import { PaginatedResponse } from '../../common/http/pagination-query.dto';

@Injectable()
export class DisastersService {
  constructor(
    @InjectRepository(Disaster)
    private readonly disasterRepo: Repository<Disaster>,
    @InjectRepository(DisasterType)
    private readonly typeRepo: Repository<DisasterType>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  async create(dto: CreateDisasterDto): Promise<Disaster> {
    const disaster = this.disasterRepo.create({
      title: dto.title,
      description: dto.description,
      location: dto.location,
      latitude: dto.latitude,
      longitude: dto.longitude,
      severity: dto.severity as Disaster['severity'],
      status: dto.status as Disaster['status'],
      casualties: dto.casualties ?? 0,
      affectedPeople: dto.affectedPeople ?? 0,
    });

    if (dto.typeId) {
      const type = await this.typeRepo.findOneBy({ id: dto.typeId });
      if (!type) throw new NotFoundException('Disaster type not found');
      disaster.type = type;
    }

    if (dto.departmentId) {
      const dept = await this.departmentRepo.findOneBy({ id: dto.departmentId });
      if (!dept) throw new NotFoundException('Department not found');
      disaster.department = dept;
    }

    return this.disasterRepo.save(disaster);
  }

  async findAll(query: GetDisastersQueryDto): Promise<PaginatedResponse<Disaster>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;
    const search = query.q?.toLowerCase();

    const qb = this.disasterRepo
      .createQueryBuilder('disaster')
      .leftJoinAndSelect('disaster.type', 'type')
      .leftJoinAndSelect('type.category', 'category')
      .leftJoinAndSelect('disaster.department', 'department')
      .orderBy('disaster.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('disaster.status = :status', { status: query.status });
    }
    if (query.severity) {
      qb.andWhere('disaster.severity = :severity', { severity: query.severity });
    }
    if (query.departmentId) {
      qb.andWhere('department.id = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (search) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb
            .where('LOWER(disaster.title) LIKE :q', {
              q: `%${search}%`,
            })
            .orWhere('LOWER(disaster.location) LIKE :q', {
              q: `%${search}%`,
            });
        }),
      );
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Disaster> {
    const disaster = await this.disasterRepo.findOne({
      where: { id },
      relations: ['type', 'type.category', 'department'],
    });
    if (!disaster) throw new NotFoundException('Disaster not found');
    return disaster;
  }

  async update(id: number, dto: UpdateDisasterDto): Promise<Disaster> {
    const disaster = await this.disasterRepo.findOneBy({ id });
    if (!disaster) throw new NotFoundException('Disaster not found');

    if (dto.typeId) {
      const type = await this.typeRepo.findOneBy({ id: dto.typeId });
      if (!type) throw new NotFoundException('Disaster type not found');
      disaster.type = type;
    }

    if (dto.departmentId) {
      const dept = await this.departmentRepo.findOneBy({ id: dto.departmentId });
      if (!dept) throw new NotFoundException('Department not found');
      disaster.department = dept;
    }

    if (dto.title) disaster.title = dto.title;
    if (dto.description) disaster.description = dto.description;
    if (dto.location) disaster.location = dto.location;
    if (dto.latitude !== undefined) disaster.latitude = dto.latitude;
    if (dto.longitude !== undefined) disaster.longitude = dto.longitude;
    if (dto.severity) disaster.severity = dto.severity as Disaster['severity'];
    if (dto.status) disaster.status = dto.status as Disaster['status'];
    if (dto.casualties !== undefined) disaster.casualties = dto.casualties;
    if (dto.affectedPeople !== undefined) disaster.affectedPeople = dto.affectedPeople;

    return this.disasterRepo.save(disaster);
  }

  async remove(id: number): Promise<void> {
    const result = await this.disasterRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Disaster not found');
  }

  async count(): Promise<number> {
    return this.disasterRepo.count();
  }

  async countActive(): Promise<number> {
    return this.disasterRepo.count({ where: { status: 'active' } });
  }
}
