import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/http/pagination-query.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async saveMessage(
    senderId: number,
    room: string,
    content: string,
  ): Promise<ChatMessage> {
    const sender = await this.userRepo.findOne({
      where: { id: senderId },
      select: ['id', 'name', 'avatar'],
    });
    if (!sender) {
      throw new NotFoundException(`User ${senderId} not found`);
    }

    const message = this.messageRepo.create({
      room,
      content,
      sender,
    });

    return this.messageRepo.save(message);
  }

  async getHistory(
    room: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResponse<ChatMessage>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    // Use QueryBuilder instead of findAndCount + relations so we select only
    // the three sender columns we actually need (id, name, avatar).
    // findAndCount with relations loads every column from `users` (including
    // password hash, permissions JSON, etc.) for every row — wasteful and
    // unnecessary.  The composite index (room, created_at) is used by both the
    // data fetch and the COUNT query.
    const [items, total] = await this.messageRepo
      .createQueryBuilder('msg')
      .leftJoin('msg.sender', 'sender')
      .addSelect(['sender.id', 'sender.name', 'sender.avatar'])
      .where('msg.room = :room', { room })
      .orderBy('msg.createdAt', 'DESC')
      .skip(offset)
      .take(safeLimit)
      .getManyAndCount();

    // Return oldest-first for display
    return {
      items: items.reverse(),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }
}
