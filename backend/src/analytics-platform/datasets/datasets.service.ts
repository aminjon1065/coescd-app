import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnlDimDataset } from '../entities/anl-dim-dataset.entity';

@Injectable()
export class DatasetsService {
  constructor(
    @InjectRepository(AnlDimDataset) private readonly repo: Repository<AnlDimDataset>,
  ) {}

  findAll(userId: number) {
    return this.repo.find({
      where: [{ ownerId: userId }, { isPublic: true }],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const ds = await this.repo.findOne({ where: { id } });
    if (!ds) throw new NotFoundException('Dataset not found');
    return ds;
  }

  create(dto: Partial<AnlDimDataset>, ownerId: number) {
    return this.repo.save({ ...dto, ownerId, createdAt: new Date(), updatedAt: new Date() });
  }

  async update(id: string, dto: Partial<AnlDimDataset>) {
    await this.findOne(id);
    await this.repo.update(id, { ...dto, updatedAt: new Date() });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
