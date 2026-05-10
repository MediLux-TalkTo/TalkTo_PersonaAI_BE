import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { AdminService } from '../admin/admin.service';
import {
  SystemLogCategory,
  SystemLogSeverity,
} from '../common/enums/log.enum';
import {
  MessageInputMode,
  MessageSenderType,
  MessageStatus,
} from '../common/enums/message.enums';
import { MemoryStatus } from '../common/enums/memory.enums';
import { Memory } from '../memories/memory.entity';
import { PersonasService } from '../personas/personas.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { SendVoiceMessageDto } from './dto/send-voice-message.dto';
import { ChatRuntimeService } from './chat-runtime.service';
import { Conversation } from './conversation.entity';
import { MessageMemoryRef } from './message-memory-ref.entity';
import { Message } from './message.entity';
import { VoiceArtifact } from './voice-artifact.entity';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly personasService: PersonasService,
    private readonly chatRuntimeService: ChatRuntimeService,
    private readonly adminService: AdminService,
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(MessageMemoryRef)
    private readonly messageMemoryRefsRepository: Repository<MessageMemoryRef>,
    @InjectRepository(VoiceArtifact)
    private readonly voiceArtifactsRepository: Repository<VoiceArtifact>,
    @InjectRepository(Memory)
    private readonly memoriesRepository: Repository<Memory>,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    const conversation = this.conversationsRepository.create({
      userId,
      personaId: dto.personaId,
      channel: dto.channel,
      title: dto.title ?? null,
      lastMessageAt: null,
      endedAt: null,
    });

    return this.conversationsRepository.save(conversation);
  }

  async listConversations(userId: string) {
    return this.conversationsRepository.find({
      where: { userId },
      relations: ['persona'],
      order: { lastMessageAt: 'DESC', startedAt: 'DESC' },
    });
  }

  async getConversationDetail(
    conversationId: string,
    actor: { userId: string; role: Role },
  ) {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId },
      relations: ['persona', 'messages'],
      order: {
        messages: {
          createdAt: 'ASC',
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    if (actor.role !== Role.ADMIN && conversation.userId !== actor.userId) {
      throw new NotFoundException('Conversation not found.');
    }

    return conversation;
  }

  async sendTextMessage(
    conversationId: string,
    actor: { userId: string; role: Role },
    dto: SendTextMessageDto,
  ) {
    const conversation = await this.assertConversationOwnership(conversationId, actor);
    const persona = await this.personasService.getActivePersona();
    const startedAt = Date.now();
    const relatedMemories = await this.retrieveMemories(dto.content);
    const assistantReply = this.chatRuntimeService.buildAssistantReply({
      persona,
      userMessage: dto.content,
      memories: relatedMemories,
    });
    const latencyMs = Date.now() - startedAt;

    return this.dataSource.transaction(async (manager) => {
      const userMessage = manager.create(Message, {
        conversationId: conversation.id,
        senderType: MessageSenderType.USER,
        content: dto.content,
        inputMode: MessageInputMode.TEXT,
        status: MessageStatus.COMPLETED,
        retrievedMemoryIds: [],
      });

      const savedUserMessage = await manager.save(userMessage);

      const assistantMessage = manager.create(Message, {
        conversationId: conversation.id,
        senderType: MessageSenderType.ASSISTANT,
        content: assistantReply,
        inputMode: MessageInputMode.TEXT,
        status: MessageStatus.COMPLETED,
        latencyMs,
        retrievedMemoryIds: relatedMemories.map((memory) => memory.id),
      });

      const savedAssistantMessage = await manager.save(assistantMessage);

      if (relatedMemories.length > 0) {
        const refs = relatedMemories.map((memory) =>
          manager.create(MessageMemoryRef, {
            messageId: savedAssistantMessage.id,
            memoryId: memory.id,
          }),
        );
        await manager.save(refs);
      }

      conversation.lastMessageAt = new Date();
      await manager.save(conversation);

      return {
        userMessage: savedUserMessage,
        assistantMessage: savedAssistantMessage,
      };
    });
  }

  async sendVoiceMessage(
    conversationId: string,
    actor: { userId: string; role: Role },
    dto: SendVoiceMessageDto,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('audio_file is required.');
    }

    const conversation = await this.assertConversationOwnership(conversationId, actor);
    const persona = await this.personasService.getActivePersona();
    const sttText = dto.sttText?.trim() || '음성 메시지가 전송되었습니다.';
    const startedAt = Date.now();
    const relatedMemories = await this.retrieveMemories(sttText);
    const assistantReply = this.chatRuntimeService.buildAssistantReply({
      persona,
      userMessage: sttText,
      memories: relatedMemories,
    });
    const latencyMs = Date.now() - startedAt;

    try {
      return await this.dataSource.transaction(async (manager) => {
        const userMessage = manager.create(Message, {
          conversationId: conversation.id,
          senderType: MessageSenderType.USER,
          content: sttText,
          inputMode: MessageInputMode.VOICE,
          status: MessageStatus.COMPLETED,
          retrievedMemoryIds: [],
        });
        const savedUserMessage = await manager.save(userMessage);

        const assistantMessage = manager.create(Message, {
          conversationId: conversation.id,
          senderType: MessageSenderType.ASSISTANT,
          content: assistantReply,
          inputMode: MessageInputMode.VOICE,
          status: MessageStatus.COMPLETED,
          latencyMs,
          retrievedMemoryIds: relatedMemories.map((memory) => memory.id),
        });
        const savedAssistantMessage = await manager.save(assistantMessage);

        const voiceArtifact = manager.create(VoiceArtifact, {
          messageId: savedUserMessage.id,
          audioInputUrl: `/uploads/${Date.now()}-${file.originalname}`,
          sttText,
          ttsAudioUrl: `/audio/assistant-${savedAssistantMessage.id}.mp3`,
          sttStatus: 'COMPLETED',
          ttsStatus: 'COMPLETED',
          fallbackTextUsed: false,
        });
        const savedVoiceArtifact = await manager.save(voiceArtifact);

        if (relatedMemories.length > 0) {
          const refs = relatedMemories.map((memory) =>
            manager.create(MessageMemoryRef, {
              messageId: savedAssistantMessage.id,
              memoryId: memory.id,
            }),
          );
          await manager.save(refs);
        }

        conversation.lastMessageAt = new Date();
        await manager.save(conversation);

        return {
          userMessage: {
            ...savedUserMessage,
            sttText,
          },
          assistantMessage: {
            ...savedAssistantMessage,
            ttsAudioUrl: savedVoiceArtifact.ttsAudioUrl,
            fallbackTextUsed: savedVoiceArtifact.fallbackTextUsed,
          },
        };
      });
    } catch (error) {
      await this.adminService.recordLog({
        category: SystemLogCategory.STT,
        severity: SystemLogSeverity.ERROR,
        conversationId,
        detail: {
          reason: 'voice_message_failed',
          error: error instanceof Error ? error.message : 'unknown',
        },
      });
      throw error;
    }
  }

  private async assertConversationOwnership(
    conversationId: string,
    actor: { userId: string; role: Role },
  ) {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    if (actor.role !== Role.ADMIN && conversation.userId !== actor.userId) {
      throw new NotFoundException('Conversation not found.');
    }

    return conversation;
  }

  private async retrieveMemories(query: string): Promise<Memory[]> {
    const trimmed = query.trim();

    if (!trimmed) {
      return this.memoriesRepository.find({
        where: { status: MemoryStatus.ACTIVE },
        take: 3,
        order: { updatedAt: 'DESC' },
      });
    }

    return this.memoriesRepository.find({
      where: [
        { status: MemoryStatus.ACTIVE, title: ILike(`%${trimmed}%`) },
        { status: MemoryStatus.ACTIVE, bodyMarkdown: ILike(`%${trimmed}%`) },
      ],
      take: 3,
      order: { updatedAt: 'DESC' },
    });
  }
}
