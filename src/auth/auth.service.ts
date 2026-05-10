import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin/admin.service';
import {
  SystemLogCategory,
  SystemLogSeverity,
} from '../common/enums/log.enum';
import { compareValue, hashValue } from '../common/utils/password.util';
import { ConsentsService } from '../consents/consents.service';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly consentsService: ConsentsService,
    private readonly jwtService: JwtService,
    private readonly adminService: AdminService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByIdentifier(dto.identifier);

    if (!user || !(await compareValue(dto.password, user.passwordHash))) {
      await this.adminService.recordLog({
        category: SystemLogCategory.AUTH,
        severity: SystemLogSeverity.WARN,
        detail: { identifier: dto.identifier, reason: 'invalid_login' },
      });
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('User is disabled.');
    }

    const tokens = await this.generateTokens(user.id, user.role);
    await this.usersService.updateRefreshTokenHash(
      user.id,
      await hashValue(tokens.refreshToken),
    );
    await this.usersService.updateLastLogin(user.id);

    const latestConsent = await this.consentsService.getLatest(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        consentRequired:
          !latestConsent ||
          !latestConsent.personaDisclaimerAccepted ||
          !latestConsent.conversationStorageAccepted ||
          !latestConsent.voiceSynthesisAccepted,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
    });

    const user = await this.usersService.findById(payload.sub);
    const isValid = await compareValue(dto.refreshToken, user.refreshTokenHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokens = await this.generateTokens(user.id, user.role);
    await this.usersService.updateRefreshTokenHash(
      user.id,
      await hashValue(tokens.refreshToken),
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
    };
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshTokenHash(userId, null);
    return { loggedOut: true };
  }

  private async generateTokens(userId: string, role: Role) {
    const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '1h') as any;
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
          expiresIn: accessExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
