import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { Response } from 'express';
import { Auth } from './decorators/auth.decorators';
import { AuthType } from './enums/auth-type.enum';
import { Request } from 'express';
import { Roles } from '../authorization/decorators/roles.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { Permission } from '../authorization/permission.type';
import { ConfigService } from '@nestjs/config';
import { ActiveUser } from '../decorators/active-user.decorator';

@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly configService: ConfigService,
  ) {}

  private getRefreshCookieOptions() {
    const secure = this.configService.get<string>('COOKIE_SECURE', 'false');
    const sameSite = this.configService.get<string>('COOKIE_SAMESITE', 'lax');
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    const maxAgeSeconds = Number(
      this.configService.get<string>('JWT_REFRESH_TOKEN_TTL', '86400'),
    );
    const maxAge = maxAgeSeconds * 1000;

    return {
      httpOnly: true,
      secure: secure === 'true',
      sameSite: sameSite as 'lax' | 'strict' | 'none',
      domain: domain || undefined,
      maxAge,
      path: '/',
    };
  }

  @Roles(Role.Admin)
  @Permissions(Permission.USERS_CREATE)
  @Post('sign-up')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @HttpCode(HttpStatus.OK)
  @Auth(AuthType.None)
  @Post('sign-in')
  async signIn(
    @Res({ passthrough: true }) response: Response,
    @Body() signInDto: SignInDto,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.signIn(signInDto);
    response.cookie('refreshToken', refreshToken, this.getRefreshCookieOptions());
    return { accessToken, user };
  }

  @HttpCode(HttpStatus.OK)
  @Auth(AuthType.None)
  @Post('refresh-tokens')
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = request.cookies['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await this.authService.refreshTokens(refreshToken);

    res.cookie('refreshToken', newRefreshToken, this.getRefreshCookieOptions());

    return { accessToken, user };
  }

  @Auth(AuthType.None)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = request.cookies['refreshToken'];
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }
    res.clearCookie('refreshToken', this.getRefreshCookieOptions());
    return { success: true };
  }

  @Get('me')
  async me(@ActiveUser('sub') userId: number) {
    return this.authService.getUserById(userId);
  }
}
