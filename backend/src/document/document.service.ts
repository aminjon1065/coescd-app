import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  async create(dto: CreateDocumentDto, senderId: number): Promise<Document> {
    const sender = await this.userRepo.findOneBy({ id: senderId });
    if (!sender) throw new NotFoundException('Sender not found');

    const doc = this.documentRepo.create({
      title: dto.title,
      description: dto.description,
      type: dto.type as Document['type'],
      status: dto.status as Document['status'],
      sender,
      fileName: dto.fileName,
      filePath: dto.filePath,
    });

    if (dto.receiverId) {
      const receiver = await this.userRepo.findOneBy({ id: dto.receiverId });
      if (!receiver) throw new NotFoundException('Receiver not found');
      doc.receiver = receiver;
    }

    if (dto.departmentId) {
      const dept = await this.departmentRepo.findOneBy({ id: dto.departmentId });
      if (!dept) throw new NotFoundException('Department not found');
      doc.department = dept;
    }

    return this.documentRepo.save(doc);
  }

  async findAll(type?: string, status?: string): Promise<Document[]> {
    const where: Record<string, string> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    return this.documentRepo.find({
      where,
      relations: ['sender', 'receiver', 'department'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Document> {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: ['sender', 'receiver', 'department'],
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async update(id: number, dto: UpdateDocumentDto): Promise<Document> {
    const doc = await this.documentRepo.findOneBy({ id });
    if (!doc) throw new NotFoundException('Document not found');

    if (dto.receiverId) {
      const receiver = await this.userRepo.findOneBy({ id: dto.receiverId });
      if (!receiver) throw new NotFoundException('Receiver not found');
      doc.receiver = receiver;
    }

    if (dto.departmentId) {
      const dept = await this.departmentRepo.findOneBy({ id: dto.departmentId });
      if (!dept) throw new NotFoundException('Department not found');
      doc.department = dept;
    }

    if (dto.title) doc.title = dto.title;
    if (dto.description) doc.description = dto.description;
    if (dto.type) doc.type = dto.type as Document['type'];
    if (dto.status) doc.status = dto.status as Document['status'];
    if (dto.fileName) doc.fileName = dto.fileName;
    if (dto.filePath) doc.filePath = dto.filePath;

    return this.documentRepo.save(doc);
  }

  async remove(id: number): Promise<void> {
    const result = await this.documentRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Document not found');
  }
}
