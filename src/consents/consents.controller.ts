import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { success } from '../common/utils/api-response';
import { CreateConsentDto } from './dto/create-consent.dto';
import {
  ConsentCreateResponseDto,
  ConsentStatusResponseDto,
} from './dto/consent-response.dto';
import { ConsentsService } from './consents.service';

@ApiTags('Consent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get('me')
  @ApiOperation({
    summary: '내 동의 상태 조회',
    description: '프론트의 동의 화면 진입 여부 판단에 사용합니다.',
  })
  @ApiOkResponse({ type: ConsentStatusResponseDto })
  async getMe(@CurrentUser() user: { userId: string }) {
    const consent = await this.consentsService.getLatest(user.userId);

    return success({
      consent,
      consentRequired:
        !consent ||
        !consent.personaDisclaimerAccepted ||
        !consent.conversationStorageAccepted ||
        !consent.voiceSynthesisAccepted,
    });
  }

  @Post()
  @ApiOperation({
    summary: '동의 저장',
    description: '고지/동의 화면의 체크 결과를 저장합니다.',
  })
  @ApiBody({ type: CreateConsentDto })
  @ApiCreatedResponse({ type: ConsentCreateResponseDto })
  async create(@CurrentUser() user: { userId: string }, @Body() dto: CreateConsentDto) {
    const consent = await this.consentsService.save(user.userId, dto);
    return success(consent);
  }
}
