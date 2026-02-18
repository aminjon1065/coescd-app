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

    await this.ensureUser({
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@coescd.local',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'admin123',
      name: process.env.SEED_ADMIN_NAME ?? 'System Admin',
      role: Role.Admin,
    });
    await this.ensureUser({
      email: process.env.SEED_MANAGER_EMAIL ?? 'manager@coescd.local',
      password: process.env.SEED_MANAGER_PASSWORD ?? 'manager123',
      name: process.env.SEED_MANAGER_NAME ?? 'Department Manager',
      role: Role.Manager,
    });
    await this.ensureUser({
      email: process.env.SEED_REGULAR_EMAIL ?? 'operator@coescd.local',
      password: process.env.SEED_REGULAR_PASSWORD ?? 'operator123',
      name: process.env.SEED_REGULAR_NAME ?? 'Regular Operator',
      role: Role.Regular,
    });
  }

  private async ensureUser(payload: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }): Promise<void> {
    const existing = await this.userRepository.findOneBy({ email: payload.email });
    if (existing) {
      return;
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
  }
}
