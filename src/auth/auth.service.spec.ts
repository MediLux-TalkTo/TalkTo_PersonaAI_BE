import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import * as passwordUtil from '../common/utils/password.util';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    findByIdentifier: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
    updateLastLogin: jest.fn(),
    findById: jest.fn(),
  };

  const consentsService = {
    getLatest: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  const adminService = {
    recordLog: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as any,
      consentsService as any,
      jwtService,
      adminService as any,
    );
  });

  it('throws UnauthorizedException for invalid credentials', async () => {
    usersService.findByIdentifier.mockResolvedValue(null);

    await expect(
      service.login({ identifier: 'user@example.com', password: 'wrongpass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(adminService.recordLog).toHaveBeenCalled();
  });

  it('returns token pair and consentRequired for valid credentials', async () => {
    usersService.findByIdentifier.mockResolvedValue({
      id: 'user-1',
      name: '홍길동',
      role: Role.FAMILY,
      status: UserStatus.ACTIVE,
      passwordHash:
        '$2b$10$5UWwopjLHtRWbN1n9b0cL.SNFAHd6J7N0mH3fM4vD8vL6fZsSps2m',
    });
    jest.spyOn(passwordUtil, 'compareValue').mockResolvedValue(true);
    jest.spyOn(passwordUtil, 'hashValue').mockResolvedValue('hashed-refresh');
    (jwtService.signAsync as jest.Mock)
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    consentsService.getLatest.mockResolvedValue(null);

    const result = await service.login({
      identifier: 'user@example.com',
      password: 'ValidPass123!',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.consentRequired).toBe(true);
    expect(usersService.updateRefreshTokenHash).toHaveBeenCalled();
    expect(usersService.updateLastLogin).toHaveBeenCalledWith('user-1');
  });
});
