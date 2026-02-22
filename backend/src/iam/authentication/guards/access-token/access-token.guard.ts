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
import { DelegationContextService } from '../../delegation-context.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly delegationContextService: DelegationContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is missing');
    }

    let payload: ActiveUserData;
    try {
      payload = await this.jwtService.verifyAsync<ActiveUserData>(
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
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request[REQUEST_USER_KEY] =
      await this.delegationContextService.applyDelegationToRequest(
        request,
        payload,
      );
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
