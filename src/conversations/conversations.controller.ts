import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { success } from '../common/utils/api-response';
import {
  ConversationDetailResponseDto,
  ConversationListResponseDto,
  ConversationResponseDto,
  TextMessageResponseDto,
  VoiceMessageResponseDto,
} from './dto/conversation-response.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { SendVoiceMessageDto } from './dto/send-voice-message.dto';
import { ConversationsService } from './conversations.service';
import { Role } from '../common/enums/role.enum';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({
    summary: '대화 세션 생성',
    description: '텍스트 또는 음성 대화를 시작하기 위한 conversation을 생성합니다.',
  })
  @ApiBody({ type: CreateConversationDto })
  @ApiCreatedResponse({ type: ConversationResponseDto })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateConversationDto,
  ) {
    return success(await this.conversationsService.createConversation(user.userId, dto));
  }

  @Get()
  @ApiOperation({
    summary: '내 대화 목록 조회',
    description: '사용자의 최근 대화 목록을 반환합니다.',
  })
  @ApiOkResponse({ type: ConversationListResponseDto })
  async list(@CurrentUser() user: { userId: string }) {
    return success(await this.conversationsService.listConversations(user.userId));
  }

  @Get(':conversationId')
  @ApiOperation({
    summary: '대화 상세 조회',
    description: '메시지 목록을 포함한 conversation 상세를 조회합니다.',
  })
  @ApiParam({ name: 'conversationId', example: 'conv-001' })
  @ApiOkResponse({ type: ConversationDetailResponseDto })
  async getDetail(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { userId: string; role: Role },
  ) {
    return success(
      await this.conversationsService.getConversationDetail(conversationId, user),
    );
  }

  @Post(':conversationId/messages/text')
  @ApiOperation({
    summary: '텍스트 메시지 전송',
    description: '텍스트 메시지를 저장하고 assistant 응답을 함께 반환합니다.',
  })
  @ApiParam({ name: 'conversationId', example: 'conv-001' })
  @ApiBody({ type: SendTextMessageDto })
  @ApiOkResponse({ type: TextMessageResponseDto })
  async sendText(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { userId: string; role: Role },
    @Body() dto: SendTextMessageDto,
  ) {
    return success(
      await this.conversationsService.sendTextMessage(conversationId, user, dto),
    );
  }

  @Post(':conversationId/messages/voice')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '음성 메시지 전송',
    description: '음성 파일과 선택적 STT 텍스트를 받아 assistant 응답을 반환합니다.',
  })
  @ApiParam({ name: 'conversationId', example: 'conv-001' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio_file: { type: 'string', format: 'binary' },
        sttText: { type: 'string', example: '할머니 오늘 뭐 하셨어요?' },
        personaId: { type: 'string', example: 'persona-grandma-001' },
      },
      required: ['audio_file'],
    },
  })
  @ApiOkResponse({ type: VoiceMessageResponseDto })
  @UseInterceptors(FileInterceptor('audio_file'))
  async sendVoice(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { userId: string; role: Role },
    @Body() dto: SendVoiceMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return success(
      await this.conversationsService.sendVoiceMessage(
        conversationId,
        user,
        dto,
        file,
      ),
    );
  }
}
