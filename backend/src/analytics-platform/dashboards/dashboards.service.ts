import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnlDashboard } from '../entities/anl-dashboard.entity';

type CreateDashboardDto = {
  title: string;
  layout?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  isPublic?: boolean;
  isDefault?: boolean;
  tags?: string[];
};

type UpdateDashboardDto = Partial<CreateDashboardDto>;

@Injectable()
export class DashboardsService {
  constructor(
    @InjectRepository(AnlDashboard) private readonly repo: Repository<AnlDashboard>,
  ) {}

  findAll(userId: number) {
    return this.repo.find({
      where: [{ ownerId: userId }, { isPublic: true }],
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Dashboard not found');
    return d;
  }

  create(dto: CreateDashboardDto, ownerId: number) {
    return this.repo.save({
      title: dto.title,
      layout: dto.layout ?? { widgets: [] },
      filters: dto.filters ?? {},
      isPublic: dto.isPublic ?? false,
      isDefault: dto.isDefault ?? false,
      tags: dto.tags ?? [],
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async update(id: string, dto: UpdateDashboardDto, userId: number) {
    const d = await this.findOne(id);
    if (d.ownerId !== userId) throw new ForbiddenException();

    if (dto.title !== undefined) d.title = dto.title;
    if (dto.layout !== undefined) d.layout = dto.layout;
    if (dto.filters !== undefined) d.filters = dto.filters;
    if (dto.isPublic !== undefined) d.isPublic = dto.isPublic;
    if (dto.isDefault !== undefined) d.isDefault = dto.isDefault;
    if (dto.tags !== undefined) d.tags = dto.tags;
    d.updatedAt = new Date();

    await this.repo.save(d);
    return d;
  }

  async remove(id: string, userId: number) {
    const d = await this.findOne(id);
    if (d.ownerId !== userId) throw new ForbiddenException();
    await this.repo.delete(id);
  }
}
