import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import jwtConfig from '../../../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { REQUEST_USER_KEY } from '../../../iam.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../../../users/entities/user.entity';
import { Repository } from 'typeorm';
import { ActiveUserData } from '../../../interfaces/activate-user-data.interface';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync<ActiveUserData>(
        token,
        this.jwtConfiguration,
      );
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: ['id', 'isActive'],
      });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User is disabled');
      }
      request[REQUEST_USER_KEY] = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
