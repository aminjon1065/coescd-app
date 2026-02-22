import {
  Body,
  Controller,
  ForbiddenException,
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
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthAuditService } from './auth-audit.service';
import { randomBytes } from 'crypto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly configService: ConfigService,
    private readonly authRateLimitService: AuthRateLimitService,
    private readonly authAuditService: AuthAuditService,
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

  private getCsrfCookieOptions() {
    const secure = this.configService.get<string>('COOKIE_SECURE', 'false');
    const sameSite = this.configService.get<string>('COOKIE_SAMESITE', 'lax');
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    const maxAgeSeconds = Number(
      this.configService.get<string>('JWT_REFRESH_TOKEN_TTL', '86400'),
    );
    const maxAge = maxAgeSeconds * 1000;

    return {
      httpOnly: false,
      secure: secure === 'true',
      sameSite: sameSite as 'lax' | 'strict' | 'none',
      domain: domain || undefined,
      maxAge,
      path: '/',
    };
  }

  private getRequestIp(request: Request): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string' && xForwardedFor.length > 0) {
      return xForwardedFor.split(',')[0].trim();
    }
    return request.ip ?? 'unknown';
  }

  private getUserAgent(request: Request): string {
    return request.headers['user-agent'] ?? 'unknown';
  }

  private assertCsrfToken(request: Request) {
    const cookieToken = request.cookies?.['csrfToken'];
    const headerToken = request.headers['x-csrf-token'];
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token validation failed');
    }
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
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() signInDto: SignInDto,
  ) {
    const ip = this.getRequestIp(request);
    const userAgent = this.getUserAgent(request);
    this.authRateLimitService.assertSignInAllowed(signInDto.email, ip);

    try {
      const { accessToken, refreshToken, user } =
        await this.authService.signIn(signInDto);
      this.authRateLimitService.registerSignInSuccess(signInDto.email, ip);

      const csrfToken = randomBytes(24).toString('hex');
      response.cookie(
        'refreshToken',
        refreshToken,
        this.getRefreshCookieOptions(),
      );
      response.cookie('csrfToken', csrfToken, this.getCsrfCookieOptions());

      await this.authAuditService.log({
        action: 'sign-in',
        success: true,
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
      });

      return { accessToken, user };
    } catch (error) {
      this.authRateLimitService.registerSignInFailure(signInDto.email, ip);
      await this.authAuditService.log({
        action: 'sign-in',
        success: false,
        email: signInDto.email,
        ip,
        userAgent,
        reason: error?.message ?? 'Sign-in failed',
      });
      throw error;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Auth(AuthType.None)
  @Post('refresh-tokens')
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getRequestIp(request);
    const userAgent = this.getUserAgent(request);
    this.authRateLimitService.assertRefreshAllowed(ip);
    this.assertCsrfToken(request);

    const refreshToken = request.cookies['refreshToken'];
    if (!refreshToken) {
      await this.authAuditService.log({
        action: 'refresh',
        success: false,
        ip,
        userAgent,
        reason: 'No refresh token found',
      });
      throw new UnauthorizedException('No refresh token found');
    }

    try {
      const {
        accessToken,
        refreshToken: newRefreshToken,
        user,
      } = await this.authService.refreshTokens(refreshToken);
      const csrfToken = randomBytes(24).toString('hex');

      res.cookie(
        'refreshToken',
        newRefreshToken,
        this.getRefreshCookieOptions(),
      );
      res.cookie('csrfToken', csrfToken, this.getCsrfCookieOptions());

      await this.authAuditService.log({
        action: 'refresh',
        success: true,
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
      });

      return { accessToken, user };
    } catch (error) {
      await this.authAuditService.log({
        action: 'refresh',
        success: false,
        ip,
        userAgent,
        reason: error?.message ?? 'Refresh failed',
      });
      throw error;
    }
  }

  @Auth(AuthType.None)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getRequestIp(request);
    const userAgent = this.getUserAgent(request);
    this.assertCsrfToken(request);

    const refreshToken = request.cookies['refreshToken'];
    let userId: number | null = null;
    if (refreshToken) {
      userId = await this.authService.revokeRefreshToken(refreshToken);
    }
    res.clearCookie('refreshToken', this.getRefreshCookieOptions());
    res.clearCookie('csrfToken', this.getCsrfCookieOptions());
    await this.authAuditService.log({
      action: 'logout',
      success: true,
      userId,
      ip,
      userAgent,
    });
    return { success: true };
  }

  @Post('change-password')
  async changePassword(
    @Req() request: Request,
    @ActiveUser('sub') userId: number,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getRequestIp(request);
    const userAgent = this.getUserAgent(request);
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    res.clearCookie('refreshToken', this.getRefreshCookieOptions());
    res.clearCookie('csrfToken', this.getCsrfCookieOptions());
    await this.authAuditService.log({
      action: 'change-password',
      success: true,
      userId,
      ip,
      userAgent,
    });
    return { success: true };
  }

  @Post('logout-all-devices')
  async logoutAllDevices(
    @Req() request: Request,
    @ActiveUser('sub') userId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getRequestIp(request);
    const userAgent = this.getUserAgent(request);
    await this.authService.logoutAllDevices(userId);
    res.clearCookie('refreshToken', this.getRefreshCookieOptions());
    res.clearCookie('csrfToken', this.getCsrfCookieOptions());
    await this.authAuditService.log({
      action: 'logout-all-devices',
      success: true,
      userId,
      ip,
      userAgent,
    });
    return { success: true };
  }

  @Get('me')
  async me(@ActiveUser('sub') userId: number) {
    return this.authService.getMe(userId);
  }
}
