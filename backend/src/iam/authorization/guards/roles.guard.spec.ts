import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  it('should be defined', () => {
    const reflector = {} as Reflector;
    expect(new RolesGuard(reflector)).toBeDefined();
  });
});
