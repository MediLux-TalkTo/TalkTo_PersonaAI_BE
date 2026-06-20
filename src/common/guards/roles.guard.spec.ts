import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Role } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const makeContext = (role?: Role) =>
    new ExecutionContextHost([
      {
        user: role ? { role } : undefined,
      },
    ]);

  it('allows ADMIN users when ADMIN is required', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(reflector);

    const allowed = guard.canActivate(makeContext(Role.ADMIN));

    expect(allowed).toBe(true);
  });

  it('allows FAMILY users when FAMILY is required', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.FAMILY]);
    const guard = new RolesGuard(reflector);

    const allowed = guard.canActivate(makeContext(Role.FAMILY));

    expect(allowed).toBe(true);
  });

  it('allows OPS and AI_QA users for matching v1 roles', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.OPS, Role.AI_QA]);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(Role.OPS))).toBe(true);
    expect(guard.canActivate(makeContext(Role.AI_QA))).toBe(true);
  });

  it('rejects FAMILY users when ADMIN is required', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(makeContext(Role.FAMILY))).toThrow(
      UnauthorizedException,
    );
  });
});
