import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnlDashboard } from '../entities/anl-dashboard.entity';

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

  create(dto: { title: string; layout?: any; tags?: string[] }, ownerId: number) {
    return this.repo.save({
      title: dto.title,
      layout: dto.layout ?? { widgets: [] },
      tags: dto.tags ?? [],
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async update(id: string, dto: Partial<AnlDashboard>, userId: number) {
    const d = await this.findOne(id);
    if (d.ownerId !== userId) throw new ForbiddenException();
    await this.repo.update(id, { ...dto, updatedAt: new Date() });
    return this.findOne(id);
  }

  async remove(id: string, userId: number) {
    const d = await this.findOne(id);
    if (d.ownerId !== userId) throw new ForbiddenException();
    await this.repo.delete(id);
  }
}
