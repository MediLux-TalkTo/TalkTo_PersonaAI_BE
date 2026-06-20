import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import { CreatePersonaRuntimeMessageDto, CreatePersonaRuntimeSessionDto } from './dto/persona-runtime.dto';
import { PersonaRuntimeService } from './persona-runtime.service';

type AuthenticatedUser = {
  readonly userId: string;
};

@ApiTags('Persona Runtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('persona')
export class PersonaRuntimeController {
  constructor(private readonly personaRuntimeService: PersonaRuntimeService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a gated Voice Persona runtime session' })
  @ApiBody({ type: CreatePersonaRuntimeSessionDto })
  @ApiCreatedResponse()
  @ApiCommonErrorResponses({ forbidden: true })
  async createSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreatePersonaRuntimeSessionDto,
  ) {
    return success(
      await this.personaRuntimeService.createSession(currentUser.userId, dto),
    );
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Send a message to a gated Voice Persona runtime session' })
  @ApiBody({ type: CreatePersonaRuntimeMessageDto })
  @ApiCreatedResponse()
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async createMessage(
    @Param('sessionId') sessionId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreatePersonaRuntimeMessageDto,
  ) {
    return success(
      await this.personaRuntimeService.createMessage(
        sessionId,
        currentUser.userId,
        dto,
      ),
    );
  }
}
