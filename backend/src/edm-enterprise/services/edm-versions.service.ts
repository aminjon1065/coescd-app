import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EdmV2DocumentVersion, VersionChangeType } from '../entities/edm-document-version.entity';
import { EdmV2Document } from '../entities/edm-document.entity';

@Injectable()
export class EdmVersionsService {
  constructor(
    @InjectRepository(EdmV2DocumentVersion)
    private readonly repo: Repository<EdmV2DocumentVersion>,
    @InjectRepository(EdmV2Document)
    private readonly docRepo: Repository<EdmV2Document>,
  ) {}

  async save(
    documentId: string,
    content: Record<string, unknown>,
    actorId: number,
    changeType: VersionChangeType = 'auto_save',
    changeSummary?: string,
  ): Promise<EdmV2DocumentVersion> {
    const doc = await this.docRepo.findOneOrFail({ where: { id: documentId } });
    const nextVersion = doc.currentVersion + (changeType === 'auto_save' ? 0 : 1);
    const wordCount = this.estimateWordCount(content);

    // For auto_save — upsert the current version number slot
    if (changeType === 'auto_save') {
      const existing = await this.repo.findOne({
        where: { documentId, versionNumber: doc.currentVersion },
      });
      if (existing) {
        existing.content = content;
        existing.wordCount = wordCount;
        return this.repo.save(existing);
      }
    }

    const version = this.repo.create({
      documentId,
      versionNumber: nextVersion,
      content,
      changeType,
      changeSummary: changeSummary ?? null,
      wordCount,
      createdById: actorId,
    });
    const saved = await this.repo.save(version);

    if (changeType !== 'auto_save') {
      await this.docRepo.update(documentId, { currentVersion: nextVersion, updatedById: actorId });
    }
    return saved;
  }

  async getVersion(documentId: string, versionNumber: number): Promise<EdmV2DocumentVersion> {
    return this.repo.findOneOrFail({
      where: { documentId, versionNumber },
      relations: ['createdBy'],
    });
  }

  async getLatest(documentId: string): Promise<EdmV2DocumentVersion | null> {
    return this.repo.findOne({
      where: { documentId },
      order: { versionNumber: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async list(documentId: string): Promise<EdmV2DocumentVersion[]> {
    return this.repo.find({
      where: { documentId },
      order: { versionNumber: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async restore(
    documentId: string,
    versionNumber: number,
    actorId: number,
  ): Promise<EdmV2DocumentVersion> {
    const target = await this.getVersion(documentId, versionNumber);
    return this.save(
      documentId,
      target.content,
      actorId,
      'manual_save',
      `Restored from v${versionNumber}`,
    );
  }

  private estimateWordCount(content: Record<string, unknown>): number {
    try {
      const json = JSON.stringify(content);
      const text = json.replace(/"type":"[^"]*"/g, '').replace(/[^а-яА-ЯёЁa-zA-Z0-9\s]/g, ' ');
      return text.split(/\s+/).filter(Boolean).length;
    } catch {
      return 0;
    }
  }
}
