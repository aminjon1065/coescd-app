import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { GisLayer } from './entities/gis-layer.entity';
import { GisFeature } from './entities/gis-feature.entity';
import { CreateGisLayerDto } from './dto/create-gis-layer.dto';
import { UpdateGisLayerDto } from './dto/update-gis-layer.dto';
import { CreateGisFeatureDto } from './dto/create-gis-feature.dto';
import { UpdateGisFeatureDto } from './dto/update-gis-feature.dto';
import { GetGisFeaturesQueryDto } from './dto/get-gis-features-query.dto';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';
import { Department } from '../department/entities/department.entity';
import { User } from '../users/entities/user.entity';
import {
  PaginatedResponse,
} from '../common/http/pagination-query.dto';

@Injectable()
export class GisService {
  constructor(
    @InjectRepository(GisLayer)
    private readonly layerRepo: Repository<GisLayer>,
    @InjectRepository(GisFeature)
    private readonly featureRepo: Repository<GisFeature>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Layers ──────────────────────────────────────────────────────────────

  async createLayer(
    dto: CreateGisLayerDto,
    actor: ActiveUserData,
  ): Promise<GisLayer> {
    const department = actor.departmentId
      ? await this.departmentRepo.findOneBy({ id: actor.departmentId })
      : null;
    const createdBy = await this.userRepo.findOneBy({ id: actor.sub });

    const layer = this.layerRepo.create({
      name: dto.name,
      type: dto.type ?? 'incident',
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
      department: department ?? null,
      createdBy: createdBy ?? null,
    });
    return this.layerRepo.save(layer);
  }

  async findAllLayers(actor: ActiveUserData): Promise<GisLayer[]> {
    const qb = this.layerRepo
      .createQueryBuilder('layer')
      .leftJoinAndSelect('layer.department', 'department')
      .leftJoinAndSelect('layer.createdBy', 'createdBy')
      .where('layer.isActive = :active', { active: true })
      .orderBy('layer.createdAt', 'DESC');

    // Non-admins only see their department's layers + layers with no department
    if (actor.role !== Role.Admin && actor.role !== Role.Manager) {
      if (actor.departmentId) {
        qb.andWhere(
          new Brackets((qb2) => {
            qb2
              .where('department.id = :deptId', { deptId: actor.departmentId })
              .orWhere('department.id IS NULL');
          }),
        );
      } else {
        qb.andWhere('department.id IS NULL');
      }
    }

    return qb.getMany();
  }

  async updateLayer(
    id: number,
    dto: UpdateGisLayerDto,
    actor: ActiveUserData,
  ): Promise<GisLayer> {
    const layer = await this.layerRepo.findOne({
      where: { id },
      relations: { department: true, createdBy: true },
    });
    if (!layer) throw new NotFoundException(`GIS layer ${id} not found`);
    this.assertWriteScope(actor, layer.department?.id ?? null);

    if (dto.name !== undefined) layer.name = dto.name;
    if (dto.type !== undefined) layer.type = dto.type;
    if (dto.description !== undefined) layer.description = dto.description ?? null;
    if (dto.isActive !== undefined) layer.isActive = dto.isActive;

    return this.layerRepo.save(layer);
  }

  async removeLayer(id: number, actor: ActiveUserData): Promise<void> {
    const layer = await this.layerRepo.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!layer) throw new NotFoundException(`GIS layer ${id} not found`);
    this.assertWriteScope(actor, layer.department?.id ?? null);
    await this.layerRepo.remove(layer);
  }

  // ─── Features ────────────────────────────────────────────────────────────

  async createFeature(
    dto: CreateGisFeatureDto,
    actor: ActiveUserData,
  ): Promise<GisFeature> {
    const departmentId = dto.departmentId ?? actor.departmentId ?? null;
    const department = departmentId
      ? await this.departmentRepo.findOneBy({ id: departmentId })
      : null;
    const createdBy = await this.userRepo.findOneBy({ id: actor.sub });

    const layer =
      dto.layerId != null
        ? await this.layerRepo.findOneBy({ id: dto.layerId })
        : null;

    const feature = this.featureRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      latitude: dto.latitude,
      longitude: dto.longitude,
      geometry: dto.geometry ?? null,
      severity: dto.severity ?? 'medium',
      status: dto.status ?? 'active',
      properties: dto.properties ?? null,
      layer: layer ?? null,
      department: department ?? null,
      createdBy: createdBy ?? null,
    });
    return this.featureRepo.save(feature);
  }

  async findAllFeatures(
    query: GetGisFeaturesQueryDto,
  ): Promise<PaginatedResponse<GisFeature>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const qb = this.featureRepo
      .createQueryBuilder('feature')
      .leftJoinAndSelect('feature.layer', 'layer')
      .leftJoinAndSelect('feature.department', 'department')
      .leftJoinAndSelect('feature.createdBy', 'createdBy')
      .orderBy('feature.createdAt', query.sortOrder === 'asc' ? 'ASC' : 'DESC');

    if (query.severity) {
      qb.andWhere('feature.severity = :severity', { severity: query.severity });
    }
    if (query.status) {
      qb.andWhere('feature.status = :status', { status: query.status });
    }
    if (query.departmentId) {
      qb.andWhere('department.id = :deptId', {
        deptId: Number(query.departmentId),
      });
    }
    if (query.layerId) {
      qb.andWhere('layer.id = :layerId', { layerId: Number(query.layerId) });
    }
    if (query.q) {
      const search = `%${query.q.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((qb2) => {
          qb2
            .where('LOWER(feature.title) LIKE :q', { q: search })
            .orWhere('LOWER(feature.description) LIKE :q', { q: search });
        }),
      );
    }

    // Bounding-box filter: bbox=minLat,minLng,maxLat,maxLng
    if (query.bbox) {
      const parts = query.bbox.split(',').map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const [minLat, minLng, maxLat, maxLng] = parts;
        qb.andWhere(
          'feature.latitude BETWEEN :minLat AND :maxLat AND feature.longitude BETWEEN :minLng AND :maxLng',
          { minLat, maxLat, minLng, maxLng },
        );
      }
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async findOneFeature(id: number): Promise<GisFeature> {
    const feature = await this.featureRepo.findOne({
      where: { id },
      relations: {
        layer: true,
        department: true,
        createdBy: true,
      },
    });
    if (!feature) throw new NotFoundException(`GIS feature ${id} not found`);
    return feature;
  }

  async updateFeature(
    id: number,
    dto: UpdateGisFeatureDto,
    actor: ActiveUserData,
  ): Promise<GisFeature> {
    const feature = await this.featureRepo.findOne({
      where: { id },
      relations: { department: true, layer: true, createdBy: true },
    });
    if (!feature) throw new NotFoundException(`GIS feature ${id} not found`);
    this.assertWriteScope(actor, feature.department?.id ?? null);

    if (dto.title !== undefined) feature.title = dto.title;
    if (dto.description !== undefined) feature.description = dto.description ?? null;
    if (dto.latitude !== undefined) feature.latitude = dto.latitude;
    if (dto.longitude !== undefined) feature.longitude = dto.longitude;
    if (dto.geometry !== undefined) feature.geometry = dto.geometry ?? null;
    if (dto.severity !== undefined) feature.severity = dto.severity;
    if (dto.status !== undefined) feature.status = dto.status;
    if (dto.properties !== undefined) feature.properties = dto.properties ?? null;

    if (dto.layerId !== undefined) {
      feature.layer =
        dto.layerId != null
          ? ((await this.layerRepo.findOneBy({ id: dto.layerId })) ?? null)
          : null;
    }

    if (dto.departmentId !== undefined) {
      feature.department =
        dto.departmentId != null
          ? ((await this.departmentRepo.findOneBy({ id: dto.departmentId })) ?? null)
          : null;
    }

    return this.featureRepo.save(feature);
  }

  async removeFeature(id: number, actor: ActiveUserData): Promise<void> {
    const feature = await this.featureRepo.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!feature) throw new NotFoundException(`GIS feature ${id} not found`);
    this.assertWriteScope(actor, feature.department?.id ?? null);
    await this.featureRepo.remove(feature);
  }

  // ─── Scope helper ────────────────────────────────────────────────────────

  /**
   * GIS write scope:
   *  - Admin: unrestricted
   *  - Others: can only modify features belonging to their own department,
   *    or features with no department (unowned).
   */
  private assertWriteScope(
    actor: ActiveUserData,
    featureDeptId: number | null,
  ): void {
    if (actor.role === Role.Admin) return;
    if (featureDeptId === null) return; // unowned feature — allow
    if (actor.departmentId && actor.departmentId === featureDeptId) return;
    throw new ForbiddenException('Forbidden: outside your department scope');
  }
}
