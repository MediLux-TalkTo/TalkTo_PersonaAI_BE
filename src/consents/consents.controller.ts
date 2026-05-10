import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { success } from '../common/utils/api-response';
import { CreateConsentDto } from './dto/create-consent.dto';
import { ConsentsService } from './consents.service';

@ApiTags('Consent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get('me')
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
  async create(@CurrentUser() user: { userId: string }, @Body() dto: CreateConsentDto) {
    const consent = await this.consentsService.save(user.userId, dto);
    return success(consent);
  }
}
