import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { OrgUnit } from '../entities/org-unit.entity';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class OrgUnitsService {
  constructor(
    @InjectRepository(OrgUnit)
    private readonly orgUnitRepository: Repository<OrgUnit>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<OrgUnit[]> {
    return this.orgUnitRepository.find({
      relations: {
        parent: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findRoots(): Promise<OrgUnit[]> {
    return this.orgUnitRepository.find({
      where: {
        parent: IsNull(),
      },
      relations: {
        parent: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<OrgUnit> {
    const orgUnit = await this.orgUnitRepository.findOne({
      where: { id },
      relations: {
        parent: true,
      },
    });

    if (!orgUnit) {
      throw new NotFoundException(`Org unit with id ${id} not found`);
    }

    return orgUnit;
  }

  async create(dto: CreateOrgUnitDto): Promise<OrgUnit> {
    const parent = dto.parentId ? await this.findOne(dto.parentId) : null;
    const created = this.orgUnitRepository.create({
      name: dto.name,
      type: dto.type,
      parent,
      path: this.buildPath(dto.name, parent),
    });

    return this.orgUnitRepository.save(created);
  }

  async update(id: number, dto: UpdateOrgUnitDto): Promise<OrgUnit> {
    const orgUnit = await this.findOne(id);

    let parent = orgUnit.parent;
    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        parent = null;
      } else {
        if (dto.parentId === id) {
          throw new BadRequestException('Org unit cannot be parent of itself');
        }
        parent = await this.findOne(dto.parentId);
        await this.assertNoCycle(id, parent);
      }
    }

    orgUnit.name = dto.name ?? orgUnit.name;
    orgUnit.type = dto.type ?? orgUnit.type;
    orgUnit.parent = parent ?? null;
    orgUnit.path = this.buildPath(orgUnit.name, parent ?? null);

    const saved = await this.orgUnitRepository.save(orgUnit);
    await this.refreshDescendantPaths(saved);
    return this.findOne(saved.id);
  }

  async remove(id: number): Promise<OrgUnit> {
    const orgUnit = await this.findOne(id);
    const childrenCount = await this.orgUnitRepository.count({
      where: {
        parent: { id },
      },
    });
    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete org unit with child units');
    }

    const usersCount = await this.userRepository.count({
      where: {
        orgUnit: { id },
      },
    });
    if (usersCount > 0) {
      throw new BadRequestException('Cannot delete org unit assigned to users');
    }

    await this.orgUnitRepository.remove(orgUnit);
    return orgUnit;
  }

  private async assertNoCycle(currentId: number, parent: OrgUnit): Promise<void> {
    let cursor: OrgUnit | null = parent;
    while (cursor) {
      if (cursor.id === currentId) {
        throw new BadRequestException('Org unit cycle is not allowed');
      }

      cursor = cursor.parent?.id ? await this.findOne(cursor.parent.id) : null;
    }
  }

  private async refreshDescendantPaths(parent: OrgUnit): Promise<void> {
    const children = await this.orgUnitRepository.find({
      where: {
        parent: { id: parent.id },
      },
      relations: {
        parent: true,
      },
    });

    for (const child of children) {
      child.path = this.buildPath(child.name, parent);
      await this.orgUnitRepository.save(child);
      await this.refreshDescendantPaths(child);
    }
  }

  private buildPath(name: string, parent: OrgUnit | null): string {
    const slug = this.slugify(name);
    if (!parent) {
      return slug;
    }

    const parentPath = parent.path ?? this.slugify(parent.name);
    return `${parentPath}.${slug}`;
  }

  private slugify(value: string): string {
    const cleaned = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return cleaned.length > 0 ? cleaned : 'unit';
  }
}
