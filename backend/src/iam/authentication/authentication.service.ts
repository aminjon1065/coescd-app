import {
  ConflictException,
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
import { resolveUserPermissions } from '../authorization/role-permissions.map';

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof JwtConfig>,
    private readonly refreshTokenIdsStorage: RefreshTokenIdsStorage,
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
      },
    });
    if (!user) {
      throw new UnauthorizedException('User does not exist');
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
    const effectivePermissions = resolveUserPermissions(
      user.role,
      user.permissions,
    );
    const refreshTokenId = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserData>>(
        user.id,
        this.jwtConfiguration.accessTokenTtl,
        {
          email: user.email,
          name: user.name,
          role: user.role,
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
      user: this.toSafeUser(user),
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
        },
      });
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

  async revokeRefreshToken(token: string): Promise<void> {
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
    } catch {
      // No-op: invalid token should not leak details
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
      },
    });
    return this.toSafeUser(user);
  }

  private toSafeUser(user: User): SafeUserDto {
    const safeUser = plainToInstance(SafeUserDto, user);
    safeUser.permissions = resolveUserPermissions(user.role, user.permissions);
    return safeUser;
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
