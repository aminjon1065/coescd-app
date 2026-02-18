import { JwtService } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

describe('AccessTokenGuard', () => {
  it('should be defined', () => {
    const jwtService = {} as JwtService;
    const userRepository = {} as never;
    const jwtConfiguration = {} as never;

    expect(
      new AccessTokenGuard(jwtService, userRepository, jwtConfiguration),
    ).toBeDefined();
  });
});
