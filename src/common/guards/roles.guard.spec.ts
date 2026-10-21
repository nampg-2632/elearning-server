import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { RolesGuard } from './roles.guard';

function createContext(user?: { role?: UserRole }): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  afterEach(() => jest.restoreAllMocks());

  it('allows routes without @Roles()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows a user that has one of the required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.Admin]);

    expect(guard.canActivate(createContext({ role: UserRole.Admin }))).toBe(
      true,
    );
  });

  it('rejects a user without the required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.Admin]);

    expect(guard.canActivate(createContext({ role: UserRole.User }))).toBe(
      false,
    );
  });

  it('rejects an anonymous request on a role-restricted route', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.Admin]);

    expect(guard.canActivate(createContext())).toBe(false);
  });
});
