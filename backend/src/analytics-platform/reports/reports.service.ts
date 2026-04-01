import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnlReport } from '../entities/anl-report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AnlReport) private readonly repo: Repository<AnlReport>,
  ) {}

  findAll(ownerId: number) {
    return this.repo.find({ where: { ownerId }, order: { requestedAt: 'DESC' }, take: 50 });
  }

  async findOne(id: string) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Report not found');
    return r;
  }

  async request(dto: { title: string; template: string; params?: Record<string, unknown> }, ownerId: number) {
    const report = await this.repo.save({
      title: dto.title,
      template: dto.template,
      params: dto.params ?? {},
      status: 'pending',
      ownerId,
      requestedAt: new Date(),
    });

    // TODO: enqueue export job — for now mark as completed stub
    setTimeout(async () => {
      await this.repo.update(report.id, { status: 'completed', completedAt: new Date() });
    }, 2000);

    return report;
  }

  async getDownloadUrl(id: string): Promise<{ url: string | null }> {
    const report = await this.findOne(id);
    if (report.status !== 'completed' || !report.fileKey) {
      return { url: null };
    }
    // In production: return presigned S3 URL
    return { url: `/api/files/${report.fileKey}` };
  }
}
