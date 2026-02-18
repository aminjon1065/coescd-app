import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { HashingService } from '../iam/hashing/hashing.service';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from './enums/role.enum';
import { PermissionType } from '../iam/authorization/permission.type';
import { ScopeService } from '../iam/authorization/scope.service';
import { RefreshTokenIdsStorage } from '../iam/authentication/refresh-token-ids.storage/refresh-token-ids.storage';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly hashingService: HashingService,
    private readonly scopeService: ScopeService,
    private readonly refreshTokenIdsStorage: RefreshTokenIdsStorage,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const user = this.userRepository.create({
      ...createUserDto,
      password: await this.hashingService.hash(createUserDto.password),
    });
    return this.userRepository.save(user);
  }

  async findAll(actor: ActiveUserData) {
    if (actor.role === Role.Admin) {
      return this.userRepository.find({
        relations: {
          department: {
            parent: true,
            chief: true,
          },
        },
      });
    }

    if (actor.role === Role.Manager && actor.departmentId) {
      return this.userRepository.find({
        where: {
          department: { id: actor.departmentId },
        },
        relations: {
          department: {
            parent: true,
            chief: true,
          },
        },
      });
    }

    return this.userRepository.find({
      where: { id: actor.sub },
      relations: {
        department: {
          parent: true,
          chief: true,
        },
      },
    });
  }

  async findOne(id: number, actor: ActiveUserData) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        department: {
          parent: true,
          chief: true,
        },
      },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    this.scopeService.assertUserScope(actor, user);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto, actor: ActiveUserData) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    this.scopeService.assertUserScope(actor, user);

    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id, actor);
  }

  async remove(id: number, actor: ActiveUserData) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    this.scopeService.assertUserScope(actor, user);
    return this.userRepository.remove(user);
  }

  async updateCustomPermissions(id: number, permissions: PermissionType[]) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    user.permissions = permissions;
    return this.userRepository.save(user);
  }

  async setActive(id: number, isActive: boolean) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    user.isActive = isActive;
    const updated = await this.userRepository.save(user);
    if (!isActive) {
      await this.refreshTokenIdsStorage.invalidate(id);
    }
    return updated;
  }

}
