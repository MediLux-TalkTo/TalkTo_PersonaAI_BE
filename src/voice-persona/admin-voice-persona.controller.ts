import { Body, Controller, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import {
  RegisterVoiceProviderAssetDto,
  ReviewVoicePersonaAssetDto,
  UpdatePersonaBuildStatusDto,
  UpsertPersonaBibleDto,
} from './dto/admin-voice-persona.dto';
import { VoicePersonaService } from './voice-persona.service';

type AuthenticatedUser = {
  readonly userId: string;
};

@ApiTags('Admin Voice Persona')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.OPS, Role.AI_QA)
@Controller('admin/voice-persona')
export class AdminVoicePersonaController {
  constructor(private readonly voicePersonaService: VoicePersonaService) {}

  @Patch('documents/:documentId/review')
  @ApiOperation({ summary: 'Review Voice Persona evidence document' })
  @ApiBody({ type: ReviewVoicePersonaAssetDto })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async reviewDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ReviewVoicePersonaAssetDto,
  ) {
    return success(
      await this.voicePersonaService.reviewDocument(
        documentId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @Patch('voice-samples/:sampleId/review')
  @ApiOperation({ summary: 'Review target voice sample' })
  @ApiBody({ type: ReviewVoicePersonaAssetDto })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async reviewVoiceSample(
    @Param('sampleId') sampleId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ReviewVoicePersonaAssetDto,
  ) {
    return success(
      await this.voicePersonaService.reviewVoiceSample(
        sampleId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @Patch('applications/:applicationId/build-status')
  @ApiOperation({ summary: 'Update Voice Persona build status manually' })
  @ApiBody({ type: UpdatePersonaBuildStatusDto })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async updateBuildStatus(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdatePersonaBuildStatusDto,
  ) {
    return success(
      await this.voicePersonaService.updateBuildStatus(
        applicationId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @Put('applications/:applicationId/persona-bible')
  @ApiOperation({ summary: 'Create or update Persona Bible draft' })
  @ApiBody({ type: UpsertPersonaBibleDto })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async upsertPersonaBible(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpsertPersonaBibleDto,
  ) {
    return success(
      await this.voicePersonaService.upsertPersonaBible(
        applicationId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @Patch('persona-bibles/:bibleId/review')
  @ApiOperation({ summary: 'Review Persona Bible' })
  @ApiBody({ type: ReviewVoicePersonaAssetDto })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async reviewPersonaBible(
    @Param('bibleId') bibleId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ReviewVoicePersonaAssetDto,
  ) {
    return success(
      await this.voicePersonaService.reviewPersonaBible(
        bibleId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @Post('applications/:applicationId/provider-assets')
  @ApiOperation({ summary: 'Register manual voice provider asset' })
  @ApiBody({ type: RegisterVoiceProviderAssetDto })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async registerProviderAsset(
    @Param('applicationId') applicationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: RegisterVoiceProviderAssetDto,
  ) {
    return success(
      await this.voicePersonaService.registerProviderAsset(
        applicationId,
        currentUser.userId,
        dto,
      ),
    );
  }
}
