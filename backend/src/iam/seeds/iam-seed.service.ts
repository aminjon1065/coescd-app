import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../users/enums/role.enum';
import { HashingService } from '../hashing/hashing.service';

@Injectable()
export class IamSeedService {
  private readonly logger = new Logger(IamSeedService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly hashingService: HashingService,
  ) {}

  async seed(): Promise<void> {
    const enabled = (process.env.IAM_SEED_ENABLED ?? 'true') === 'true';
    if (!enabled) {
      return;
    }

    const usersToSeed: Array<{
      email: string;
      password: string;
      name: string;
      role: Role;
    }> = [
      {
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@coescd.local',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'admin123',
        name: process.env.SEED_ADMIN_NAME ?? 'System Admin',
        role: Role.Admin,
      },
      {
        email: process.env.SEED_MANAGER_EMAIL ?? 'manager@coescd.local',
        password: process.env.SEED_MANAGER_PASSWORD ?? 'manager123',
        name: process.env.SEED_MANAGER_NAME ?? 'Department Manager',
        role: Role.Manager,
      },
      {
        email: process.env.SEED_REGULAR_EMAIL ?? 'operator@coescd.local',
        password: process.env.SEED_REGULAR_PASSWORD ?? 'operator123',
        name: process.env.SEED_REGULAR_NAME ?? 'Regular Operator',
        role: Role.Regular,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const user of usersToSeed) {
      const result = await this.ensureUser(user);
      if (result === 'created') {
        createdCount += 1;
      } else if (result === 'updated') {
        updatedCount += 1;
      }
    }

    this.logger.log(
      `IAM seed completed. Roles covered: admin, manager, regular. Created: ${createdCount}, updated: ${updatedCount}.`,
    );
  }

  private async ensureUser(payload: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }): Promise<'created' | 'updated' | 'unchanged'> {
    const existing = await this.userRepository.findOneBy({
      email: payload.email,
    });
    const resetPasswords =
      (process.env.IAM_SEED_RESET_PASSWORDS ?? 'false') === 'true';

    if (existing) {
      let shouldSave = false;

      if (existing.role !== payload.role) {
        existing.role = payload.role;
        shouldSave = true;
      }
      if (existing.name !== payload.name) {
        existing.name = payload.name;
        shouldSave = true;
      }
      if (!existing.isVerified) {
        existing.isVerified = true;
        shouldSave = true;
      }
      if (!existing.isActive) {
        existing.isActive = true;
        shouldSave = true;
      }

      if (resetPasswords) {
        existing.password = await this.hashingService.hash(payload.password);
        shouldSave = true;
      }

      if (!shouldSave) {
        return 'unchanged';
      }

      await this.userRepository.save(existing);
      this.logger.log(`Updated ${payload.role} user: ${payload.email}`);
      return 'updated';
    }

    const passwordHash = await this.hashingService.hash(payload.password);
    const user = this.userRepository.create({
      email: payload.email,
      password: passwordHash,
      name: payload.name,
      role: payload.role,
      isVerified: true,
      permissions: [],
    });
    await this.userRepository.save(user);
    this.logger.log(`Seeded ${payload.role} user: ${payload.email}`);
    return 'created';
  }
}
