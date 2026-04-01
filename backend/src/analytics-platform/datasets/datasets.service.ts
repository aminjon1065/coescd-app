import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnlDimDataset } from '../entities/anl-dim-dataset.entity';

type DatasetPayload = {
  name?: string;
  description?: string | null;
  sourceType?: string;
  schemaDef?: Record<string, unknown>;
  isPublic?: boolean;
  tags?: string[];
};

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

  create(dto: DatasetPayload, ownerId: number) {
    const ds = this.repo.create({
      name: dto.name ?? '',
      description: dto.description ?? null,
      sourceType: dto.sourceType ?? 'manual',
      schemaDef: dto.schemaDef ?? null,
      isPublic: dto.isPublic ?? false,
      tags: dto.tags ?? [],
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.repo.save(ds);
  }

  async update(id: string, dto: DatasetPayload) {
    const ds = await this.findOne(id);
    if (dto.name !== undefined) ds.name = dto.name;
    if (dto.description !== undefined) ds.description = dto.description;
    if (dto.sourceType !== undefined) ds.sourceType = dto.sourceType;
    if (dto.schemaDef !== undefined) ds.schemaDef = dto.schemaDef;
    if (dto.isPublic !== undefined) ds.isPublic = dto.isPublic;
    if (dto.tags !== undefined) ds.tags = dto.tags;
    ds.updatedAt = new Date();
    return this.repo.save(ds);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
