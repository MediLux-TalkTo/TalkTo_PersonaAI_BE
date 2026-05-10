import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { success } from '../common/utils/api-response';
import { LoginDto } from './dto/login.dto';
import {
  CurrentUserResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: '로그인',
    description: '이메일 또는 전화번호와 비밀번호로 로그인합니다.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true })
  async login(@Body() dto: LoginDto) {
    return success(await this.authService.login(dto));
  }

  @Post('refresh')
  @ApiOperation({
    summary: '토큰 재발급',
    description: 'refresh token으로 access token을 재발급합니다.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true })
  async refresh(@Body() dto: RefreshTokenDto) {
    return success(await this.authService.refresh(dto));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiOkResponse({
    description: '로그아웃 성공',
    example: {
      success: true,
      data: { loggedOut: true },
      meta: { timestamp: '2026-05-10T07:15:00.000Z' },
    },
  })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true })
  async logout(@CurrentUser() user: { userId: string }) {
    return success(await this.authService.logout(user.userId));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: '현재 로그인 사용자 조회',
    description: '프론트에서 세션 복원 시 사용하는 사용자 정보 조회 엔드포인트입니다.',
  })
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true })
  async me(@CurrentUser() user: Record<string, unknown>) {
    return success(user);
  }
}
