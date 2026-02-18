import { RefreshTokenIdsStorage } from './refresh-token-ids.storage';

describe('RefreshTokenIdsStorage', () => {
  it('should be defined', () => {
    const configService = {
      get: jest.fn(),
    } as never;
    const jwtConfiguration = {
      refreshTokenTtl: 60,
    } as never;

    expect(new RefreshTokenIdsStorage(configService, jwtConfiguration)).toBeDefined();
  });
});
