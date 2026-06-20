import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import { OnboardingSituationResponseDto } from './dto/onboarding-situation-response.dto';
import { RecordSituationDto } from './dto/record-situation.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('situation')
  @ApiOperation({ summary: '온보딩 상황 선택 저장' })
  @ApiBody({ type: RecordSituationDto })
  @ApiCreatedResponse({ type: OnboardingSituationResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true })
  async recordSituation(
    @CurrentUser() user: { userId: string },
    @Body() dto: RecordSituationDto,
  ) {
    return success(
      await this.onboardingService.recordSituation(user.userId, dto),
    );
  }
}
