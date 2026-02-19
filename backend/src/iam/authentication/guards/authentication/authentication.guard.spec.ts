import { Reflector } from '@nestjs/core';
import { AccessTokenGuard } from '../access-token/access-token.guard';
import { AuthenticationGuard } from './authentication.guard';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

describe('AuthenticationGuard', () => {
  it('should be defined', () => {
    const reflector = {} as Reflector;
    const accessTokenGuard = {
      canActivate: () => true,
    } as unknown as AccessTokenGuard;

    expect(new AuthenticationGuard(reflector, accessTokenGuard)).toBeDefined();
  });
});
