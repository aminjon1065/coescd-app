import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Call, CallStatus } from './entities/call.entity';
import { User } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/http/pagination-query.dto';

/**
 * Subset of the WebRTC RTCIceServer dictionary that coturn / browsers consume.
 * Defined here (not imported from DOM lib) so the NestJS/Node compiler is happy.
 */
export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/** Shape returned by GET /calls/turn-credentials */
export interface TurnCredentialsResponse {
  /** RTCIceServer-compatible array — clients pass this to RTCConfiguration.iceServers */
  iceServers: IceServer[];
  /** Credential TTL in seconds (matches the HMAC username timestamp window) */
  ttl: number;
}

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepo: Repository<Call>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
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

    if (!initiator) {
      throw new NotFoundException(`User ${initiatorId} not found`);
    }
    if (!receiver) {
      throw new NotFoundException(`User ${receiverId} not found`);
    }

    const call = this.callRepo.create({
      initiator,
      receiver,
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

  /**
   * Generate short-lived HMAC-SHA1 TURN credentials for the given user.
   *
   * Uses coturn's `use-auth-secret` mechanism (RFC 5766 §10.2):
   *   username  = "<expires_unix_ts>:<userId>"
   *   credential = base64( HMAC-SHA1( TURN_SECRET, username ) )
   *
   * coturn re-derives the credential from its own copy of the secret and
   * rejects any request whose timestamp has already elapsed — so credentials
   * are automatically invalidated after `ttlSec` seconds without any
   * server-side revocation list.
   *
   * Falls back to public STUN only when TURN_SECRET or TURN_HOST is not
   * configured (e.g. local development), so the caller always gets a usable
   * iceServers array.
   */
  getTurnCredentials(userId: number): TurnCredentialsResponse {
    const ttlSec = 86_400; // 24 hours
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSec;
    const username = `${expiresAt}:${userId}`;

    const secret = this.configService.get<string>('TURN_SECRET', '');
    const host = this.configService.get<string>('TURN_HOST', '');

    // Always include public STUN servers as baseline
    const iceServers: IceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    // Only emit TURN entries when the operator has configured the server
    if (host && secret) {
      const credential = createHmac('sha1', secret)
        .update(username)
        .digest('base64');

      // UDP (primary), TCP fallback, TLS (port 5349) for restrictive firewalls
      iceServers.push(
        { urls: `turn:${host}:3478`, username, credential },
        { urls: `turn:${host}:3478?transport=tcp`, username, credential },
        { urls: `turns:${host}:5349`, username, credential },
      );
    }

    return { iceServers, ttl: ttlSec };
  }
}
