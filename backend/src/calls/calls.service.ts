import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call, CallStatus } from './entities/call.entity';
import { User } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/http/pagination-query.dto';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepo: Repository<Call>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createCall(
    initiatorId: number,
    receiverId: number,
    hasVideo = false,
  ): Promise<Call> {
    const [initiator, receiver] = await Promise.all([
      this.userRepo.findOne({
        where: { id: initiatorId },
        select: ['id', 'name', 'avatar'],
      }),
      this.userRepo.findOne({
        where: { id: receiverId },
        select: ['id', 'name', 'avatar'],
      }),
    ]);

    const call = this.callRepo.create({
      initiator: initiator ?? undefined,
      receiver: receiver ?? undefined,
      hasVideo,
      status: 'pending',
    });

    return this.callRepo.save(call);
  }

  async updateStatus(
    callId: number,
    status: CallStatus,
    extra?: {
      startedAt?: Date;
      endedAt?: Date;
      durationSec?: number;
    },
  ): Promise<Call> {
    const call = await this.callRepo.findOne({
      where: { id: callId },
      relations: ['initiator', 'receiver'],
    });

    if (!call) {
      throw new NotFoundException(`Call #${callId} not found`);
    }

    call.status = status;
    if (extra?.startedAt !== undefined) call.startedAt = extra.startedAt;
    if (extra?.endedAt !== undefined) call.endedAt = extra.endedAt;
    if (extra?.durationSec !== undefined) call.durationSec = extra.durationSec;

    return this.callRepo.save(call);
  }

  async getHistory(
    userId: number,
    page = 1,
    limit = 20,
    status?: CallStatus,
  ): Promise<PaginatedResponse<Call>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const qb = this.callRepo
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.initiator', 'initiator')
      .leftJoinAndSelect('call.receiver', 'receiver')
      .where('call.initiator_id = :userId OR call.receiver_id = :userId', {
        userId,
      });

    if (status) {
      qb.andWhere('call.status = :status', { status });
    }

    qb.orderBy('call.created_at', 'DESC').skip(offset).take(safeLimit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page: safePage, limit: safeLimit };
  }

  async findOne(callId: number): Promise<Call | null> {
    return this.callRepo.findOne({
      where: { id: callId },
      relations: ['initiator', 'receiver'],
    });
  }

  isParticipant(call: Call, userId: number): boolean {
    return call.initiator?.id === userId || call.receiver?.id === userId;
  }

  computeDuration(startedAt: Date): number {
    return Math.floor((Date.now() - startedAt.getTime()) / 1000);
  }

  async markMissed(callId: number): Promise<void> {
    await this.callRepo.update(callId, { status: 'missed' });
  }
}
