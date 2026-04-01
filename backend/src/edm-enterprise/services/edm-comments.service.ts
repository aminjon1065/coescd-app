import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { EdmV2Comment } from '../entities/edm-comment.entity';
import { EdmAuditService } from './edm-audit.service';

@Injectable()
export class EdmCommentsService {
  constructor(
    @InjectRepository(EdmV2Comment)
    private readonly repo: Repository<EdmV2Comment>,
    private readonly auditService: EdmAuditService,
  ) {}

  async create(
    documentId: string,
    actorId: number,
    body: string,
    parentId?: string | null,
    anchor?: { from: number; to: number; text: string } | null,
    isSuggestion = false,
  ): Promise<EdmV2Comment> {
    const comment = this.repo.create({
      documentId,
      createdById: actorId,
      body,
      parentId: parentId ?? null,
      anchor: anchor ?? null,
      isSuggestion,
      status: 'open',
    });
    const saved = await this.repo.save(comment);
    await this.auditService.log('document', documentId, 'COMMENT_ADDED', actorId, {
      context: { commentId: saved.id, isSuggestion },
    });
    return this.repo.findOneOrFail({ where: { id: saved.id }, relations: ['createdBy', 'replies', 'replies.createdBy'] });
  }

  async listThreads(documentId: string): Promise<EdmV2Comment[]> {
    return this.repo.find({
      where: { documentId, parentId: IsNull() },
      order: { createdAt: 'DESC' },
      relations: ['createdBy', 'replies', 'replies.createdBy'],
    });
  }

  async resolve(
    commentId: string,
    actorId: number,
    status: 'resolved' | 'accepted' | 'rejected' = 'resolved',
  ): Promise<EdmV2Comment> {
    const comment = await this.repo.findOneOrFail({ where: { id: commentId } });
    comment.status = status;
    comment.resolvedById = actorId;
    comment.resolvedAt = new Date();
    return this.repo.save(comment);
  }

  async update(commentId: string, body: string): Promise<EdmV2Comment> {
    await this.repo.update(commentId, { body });
    return this.repo.findOneOrFail({ where: { id: commentId }, relations: ['createdBy'] });
  }

  async delete(commentId: string, actorId: number): Promise<void> {
    const comment = await this.repo.findOneOrFail({ where: { id: commentId } });
    await this.auditService.log('document', comment.documentId, 'COMMENT_DELETED', actorId, {
      context: { commentId },
    });
    await this.repo.remove(comment);
  }

  async findById(commentId: string): Promise<EdmV2Comment> {
    const comment = await this.repo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }
}
