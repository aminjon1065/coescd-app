import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDisasterCategoryDto } from './dto/create-disaster-category.dto';
import { UpdateDisasterCategoryDto } from './dto/update-disaster-category.dto';
import { DisasterCategory } from './entities/category.entity'; // ← правильно!

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(DisasterCategory)
    private readonly categoryRepo: Repository<DisasterCategory>,
  ) {}

  async create(dto: CreateDisasterCategoryDto): Promise<DisasterCategory> {
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async findAll(): Promise<DisasterCategory[]> {
    return this.categoryRepo.find({ relations: ['types'] });
  }

  async findOne(id: number): Promise<DisasterCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['types'],
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(
    id: number,
    dto: UpdateDisasterCategoryDto,
  ): Promise<DisasterCategory> {
    await this.categoryRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.categoryRepo.delete(id);
  }
}
