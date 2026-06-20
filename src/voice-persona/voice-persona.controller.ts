import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
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
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import { RequestPersonaBibleChangesDto } from './dto/family-review.dto';
import {
  CreateTargetVoiceSampleDto,
  CreateVoicePersonaApplicationDto,
  CreateVoicePersonaDocumentIntentDto,
  UpsertPersonaIntakeDto,
} from './dto/voice-persona.dto';
import {
  PersonaBuildStatusResponseDto,
  PersonaIntakeResponseDto,
  TargetVoiceSampleResponseDto,
  VoicePersonaApplicationResponseDto,
  VoicePersonaDocumentIntentResponseDto,
} from './dto/voice-persona-response.dto';
import { VoicePersonaService } from './voice-persona.service';

type AuthenticatedUser = {
  readonly userId: string;
};

@ApiTags('Voice Persona')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice-persona/applications')
export class VoicePersonaController {
  constructor(private readonly voicePersonaService: VoicePersonaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a Voice Persona build application' })
  @ApiBody({ type: CreateVoicePersonaApplicationDto })
  @ApiCreatedResponse({ type: VoicePersonaApplicationResponseDto })
  @ApiCommonErrorResponses({ forbidden: true })
  async createApplication(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateVoicePersonaApplicationDto,
  ) {
    return success(
      await this.voicePersonaService.createApplication(currentUser.userId, dto),
    );
  }

  @Post(':applicationId/documents/upload-intent')
  @ApiOperation({ summary: 'Create a Voice Persona document upload intent' })
  @ApiBody({ type: CreateVoicePersonaDocumentIntentDto })
  @ApiCreatedResponse({ type: VoicePersonaDocumentIntentResponseDto })
  @ApiCommonErrorResponses({ notFound: true })
  async createDocumentUploadIntent(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateVoicePersonaDocumentIntentDto,
  ) {
    return success(
      await this.voicePersonaService.createDocumentUploadIntent(
        applicationId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @Put(':applicationId/intake')
  @ApiOperation({ summary: 'Save Voice Persona intake draft sections' })
  @ApiBody({ type: UpsertPersonaIntakeDto })
  @ApiOkResponse({ type: PersonaIntakeResponseDto })
  @ApiCommonErrorResponses({ notFound: true })
  async upsertIntake(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpsertPersonaIntakeDto,
  ) {
    return success(
      await this.voicePersonaService.upsertIntake(
        applicationId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @Post(':applicationId/intake/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit Voice Persona intake after all sections' })
  @ApiOkResponse({ type: PersonaIntakeResponseDto })
  @ApiCommonErrorResponses({ notFound: true })
  async submitIntake(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return success(
      await this.voicePersonaService.submitIntake(
        applicationId,
        currentUser.userId,
      ),
    );
  }

  @Post(':applicationId/voice-samples')
  @ApiOperation({ summary: 'Submit a target voice sample for ops review' })
  @ApiBody({ type: CreateTargetVoiceSampleDto })
  @ApiCreatedResponse({ type: TargetVoiceSampleResponseDto })
  @ApiCommonErrorResponses({ notFound: true })
  async createTargetVoiceSample(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateTargetVoiceSampleDto,
  ) {
    return success(
      await this.voicePersonaService.createTargetVoiceSample(
        applicationId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @Get(':applicationId/build-status')
  @ApiOperation({ summary: 'Get Voice Persona build status and lock reasons' })
  @ApiOkResponse({ type: PersonaBuildStatusResponseDto })
  @ApiCommonErrorResponses({ notFound: true })
  async getBuildStatus(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return success(
      await this.voicePersonaService.getBuildStatus(
        applicationId,
        currentUser.userId,
      ),
    );
  }

  @Get(':applicationId/family-review')
  @ApiOperation({ summary: 'Get family-safe Persona Bible review view' })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ notFound: true })
  async getFamilyReview(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return success(
      await this.voicePersonaService.getFamilyReview(
        applicationId,
        currentUser.userId,
      ),
    );
  }

  @Post(':applicationId/family-review/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve Persona Bible review and enable runtime config' })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ notFound: true })
  async approveFamilyReview(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return success(
      await this.voicePersonaService.approveFamilyReview(
        applicationId,
        currentUser.userId,
      ),
    );
  }

  @Post(':applicationId/family-review/request-changes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request Persona Bible changes before runtime enablement' })
  @ApiBody({ type: RequestPersonaBibleChangesDto })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ notFound: true })
  async requestFamilyReviewChanges(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: RequestPersonaBibleChangesDto,
  ) {
    return success(
      await this.voicePersonaService.requestFamilyReviewChanges(
        applicationId,
        currentUser.userId,
        dto,
      ),
    );
  }
}
