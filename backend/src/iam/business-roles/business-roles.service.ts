import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessRoleEntity } from '../authorization/entities/business-role.entity';

@Injectable()
export class BusinessRolesService {
  constructor(
    @InjectRepository(BusinessRoleEntity)
    private readonly businessRoleRepository: Repository<BusinessRoleEntity>,
  ) {}

  async findAll(): Promise<BusinessRoleEntity[]> {
    return this.businessRoleRepository.find({
      where: {
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(code: string): Promise<BusinessRoleEntity> {
    const businessRole = await this.businessRoleRepository.findOne({
      where: {
        code,
        isActive: true,
      },
    });

    if (!businessRole) {
      throw new NotFoundException(`Business role ${code} not found`);
    }

    return businessRole;
  }
}
