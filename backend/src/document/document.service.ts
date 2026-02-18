import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';
import { ScopeService } from '../iam/authorization/scope.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    private readonly scopeService: ScopeService,
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

  async findAll(
    actor: ActiveUserData,
    type?: string,
    status?: string,
  ): Promise<Document[]> {
    const qb = this.documentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.sender', 'sender')
      .leftJoinAndSelect('sender.department', 'senderDepartment')
      .leftJoinAndSelect('document.receiver', 'receiver')
      .leftJoinAndSelect('receiver.department', 'receiverDepartment')
      .leftJoinAndSelect('document.department', 'department')
      .orderBy('document.created_at', 'DESC');

    if (type) {
      qb.andWhere('document.type = :type', { type });
    }
    if (status) {
      qb.andWhere('document.status = :status', { status });
    }

    this.scopeService.applyDocumentScope(qb, actor, {
      senderAlias: 'sender',
      receiverAlias: 'receiver',
      departmentAlias: 'department',
    });

    return qb.getMany();
  }

  async findOne(id: number, actor: ActiveUserData): Promise<Document> {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: {
        sender: { department: true },
        receiver: { department: true },
        department: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    this.scopeService.assertDocumentScope(actor, doc);
    return doc;
  }

  async update(
    id: number,
    dto: UpdateDocumentDto,
    actor: ActiveUserData,
  ): Promise<Document> {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: {
        sender: { department: true },
        receiver: { department: true },
        department: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    this.scopeService.assertDocumentScope(actor, doc);

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

  async remove(id: number, actor: ActiveUserData): Promise<void> {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: {
        sender: true,
        receiver: true,
        department: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    this.scopeService.assertDocumentScope(actor, doc);
    await this.documentRepo.remove(doc);
  }
}
