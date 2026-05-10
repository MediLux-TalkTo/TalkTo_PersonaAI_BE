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
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { success } from '../common/utils/api-response';
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
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateConversationDto,
  ) {
    return success(await this.conversationsService.createConversation(user.userId, dto));
  }

  @Get()
  async list(@CurrentUser() user: { userId: string }) {
    return success(await this.conversationsService.listConversations(user.userId));
  }

  @Get(':conversationId')
  async getDetail(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { userId: string; role: Role },
  ) {
    return success(
      await this.conversationsService.getConversationDetail(conversationId, user),
    );
  }

  @Post(':conversationId/messages/text')
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
