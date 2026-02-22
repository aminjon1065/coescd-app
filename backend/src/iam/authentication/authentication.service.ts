import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { Repository } from 'typeorm';
import { HashingService } from '../hashing/hashing.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import JwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { ActiveUserData } from '../interfaces/activate-user-data.interface';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  InValidatedRefreshTokenError,
  RefreshTokenIdsStorage,
} from './refresh-token-ids.storage/refresh-token-ids.storage';
import { randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { SafeUserDto } from './dto/safe-user.dto';
import { RolePermissionsService } from '../authorization/role-permissions.service';
import { PermissionType } from '../authorization/permission.type';

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof JwtConfig>,
    private readonly refreshTokenIdsStorage: RefreshTokenIdsStorage,
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    try {
      const user = new User();
      user.email = signUpDto.email;
      user.createdAt = new Date();
      user.updatedAt = new Date();
      user.name = signUpDto.name;
      user.isVerified = false;
      user.password = await this.hashingService.hash(signUpDto.password);
      await this.userRepository.save(user);
    } catch (error) {
      console.log(error);
      const pgUniqueViolationErrorCode = '23505';
      if (error.code === pgUniqueViolationErrorCode) {
        throw new ConflictException();
      }
      throw error;
    }
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.userRepository.findOne({
      where: { email: signInDto.email },
      relations: {
        department: {
          parent: true,
          chief: true,
        },
        orgUnit: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User does not exist');
    }
    if (!user.isActive) {
      throw new ForbiddenException('User is disabled');
    }
    const isEqual = await this.hashingService.compare(
      signInDto.password,
      user.password,
    );
    if (!isEqual) {
      throw new UnauthorizedException('User does not match');
    }
    return await this.generateTokens(user);
  }

  async generateTokens(user: User) {
    const effectivePermissions = this.buildEffectivePermissions(user);
    const refreshTokenId = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserData>>(
        user.id,
        this.jwtConfiguration.accessTokenTtl,
        {
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.department?.id ?? null,
          businessRole: user.businessRole ?? null,
          orgUnitId: user.orgUnit?.id ?? null,
          orgUnitPath: user.orgUnit?.path ?? null,
          permissions: effectivePermissions,
        },
      ),
      this.signToken(user.id, this.jwtConfiguration.refreshTokenTtl, {
        refreshTokenId,
      }),
    ]);
    await this.refreshTokenIdsStorage.insert(user.id, refreshTokenId);
    return {
      accessToken,
      refreshToken,
      user: this.toSafeUser(user, effectivePermissions),
    };
  }

  async refreshTokens(token: string) {
    try {
      const { sub, refreshTokenId } = await this.jwtService.verifyAsync<
        Pick<ActiveUserData, 'sub'> & { refreshTokenId: string }
      >(token, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });
      const user = await this.userRepository.findOneOrFail({
        where: { id: sub },
        relations: {
          department: {
            parent: true,
            chief: true,
          },
          orgUnit: true,
        },
      });
      if (!user.isActive) {
        throw new ForbiddenException('User is disabled');
      }
      const isValid = await this.refreshTokenIdsStorage.validate(
        user.id,
        refreshTokenId,
      );
      if (isValid) {
        await this.refreshTokenIdsStorage.invalidate(user.id);
      } else {
        throw new Error('Refresh token is invalid');
      }
      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof InValidatedRefreshTokenError) {
        throw new UnauthorizedException('Access denied token');
      }
      throw new UnauthorizedException('Refresh token failed');
    }
  }

  async revokeRefreshToken(token: string): Promise<number | null> {
    try {
      const { sub, refreshTokenId } = await this.jwtService.verifyAsync<
        Pick<ActiveUserData, 'sub'> & { refreshTokenId: string }
      >(token, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });
      await this.refreshTokenIdsStorage.validate(sub, refreshTokenId);
      await this.refreshTokenIdsStorage.invalidate(sub);
      return sub;
    } catch {
      // No-op: invalid token should not leak details
      return null;
    }
  }

  async getUserById(userId: number) {
    const user = await this.userRepository.findOneOrFail({
      where: { id: userId },
      relations: {
        department: {
          parent: true,
          chief: true,
        },
        orgUnit: true,
      },
    });
    return this.toSafeUser(user, this.buildEffectivePermissions(user));
  }

  async getMe(userId: number) {
    return this.getUserById(userId);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User does not exist');
    }
    if (!user.isActive) {
      throw new ForbiddenException('User is disabled');
    }
    const isEqual = await this.hashingService.compare(
      currentPassword,
      user.password,
    );
    if (!isEqual) {
      throw new UnauthorizedException('Current password is invalid');
    }
    user.password = await this.hashingService.hash(newPassword);
    await this.userRepository.save(user);
    await this.refreshTokenIdsStorage.invalidate(user.id);
  }

  async logoutAllDevices(userId: number): Promise<void> {
    await this.refreshTokenIdsStorage.invalidate(userId);
  }

  private toSafeUser(
    user: User,
    effectivePermissions: PermissionType[] = this.buildEffectivePermissions(user),
  ): SafeUserDto {
    const safeUser = plainToInstance(SafeUserDto, user);
    safeUser.permissions = effectivePermissions;
    return safeUser;
  }

  private buildEffectivePermissions(user: User): PermissionType[] {
    return this.rolePermissionsService.resolveUserPermissions(
      user.role,
      user.permissions,
      user.businessRole,
    );
  }

  private async signToken<T extends object>(
    userId: number,
    expiresIn: number,
    payload?: T,
  ) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...(payload ?? {}),
      },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn,
      },
    );
  }
}
