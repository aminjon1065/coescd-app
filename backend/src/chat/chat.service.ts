import { Injectable } from '@nestjs/common';
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

    const message = this.messageRepo.create({
      room,
      content,
      sender: sender ?? undefined,
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

    const [items, total] = await this.messageRepo.findAndCount({
      where: { room },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: safeLimit,
    });

    // Return oldest-first for display
    return {
      items: items.reverse(),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }
}
