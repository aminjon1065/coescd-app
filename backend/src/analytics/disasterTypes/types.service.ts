import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDisasterTypeDto } from './dto/create-disaster-type.dto';
import { UpdateDisasterTypeDto } from './dto/update-disaster-type.dto';
import { DisasterType } from './entities/disaster-type.entity';
import { DisasterCategory } from '../disasterCategories/entities/category.entity';

@Injectable()
export class TypesService {
  constructor(
    @InjectRepository(DisasterType)
    private readonly typeRepo: Repository<DisasterType>,
    @InjectRepository(DisasterCategory)
    private readonly categoryRepo: Repository<DisasterCategory>,
  ) {}

  async create(dto: CreateDisasterTypeDto): Promise<DisasterType> {
    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');

    const type = this.typeRepo.create({ name: dto.name, category });
    return this.typeRepo.save(type);
  }

  async findAll(): Promise<DisasterType[]> {
    return this.typeRepo.find({ relations: ['category'] });
  }

  async findOne(id: number): Promise<DisasterType> {
    const type = await this.typeRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!type) throw new NotFoundException('Type not found');
    return type;
  }

  async update(id: number, dto: UpdateDisasterTypeDto): Promise<DisasterType> {
    const type = await this.typeRepo.findOneBy({ id });
    if (!type) throw new NotFoundException('Type not found');

    if (dto.categoryId) {
      const category = await this.categoryRepo.findOneBy({
        id: dto.categoryId,
      });
      if (!category) throw new NotFoundException('New category not found');
      type.category = category;
    }

    if (dto.name) {
      type.name = dto.name;
    }

    return this.typeRepo.save(type);
  }

  async remove(id: number): Promise<void> {
    await this.typeRepo.delete(id);
  }
}
