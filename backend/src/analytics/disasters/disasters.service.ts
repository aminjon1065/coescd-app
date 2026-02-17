import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Disaster } from './entities/disaster.entity';
import { DisasterType } from '../disasterTypes/entities/disaster-type.entity';
import { Department } from '../../department/entities/department.entity';
import { CreateDisasterDto } from './dto/create-disaster.dto';
import { UpdateDisasterDto } from './dto/update-disaster.dto';

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

  async findAll(): Promise<Disaster[]> {
    return this.disasterRepo.find({
      relations: ['type', 'type.category', 'department'],
      order: { createdAt: 'DESC' },
    });
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
