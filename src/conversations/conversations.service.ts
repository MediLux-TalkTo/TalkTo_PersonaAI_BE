import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AiChatHistoryItem,
  AiClientService,
  AiProviderConsentContext,
} from '../ai/ai-client.service';
import { AdminService } from '../admin/admin.service';
import { ConsentFeature } from '../common/enums/consent.enums';
import {
  SystemLogCategory,
  SystemLogSeverity,
} from '../common/enums/log.enum';
import {
  MessageInputMode,
  MessageSenderType,
  MessageStatus,
} from '../common/enums/message.enums';
import { Memory } from '../memories/memory.entity';
import { MemoriesService } from '../memories/memories.service';
import { PersonasService } from '../personas/personas.service';
import { AudioStorageService } from '../storage/audio-storage.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { SendVoiceMessageDto } from './dto/send-voice-message.dto';
import { ChatRuntimeService } from './chat-runtime.service';
import { Conversation } from './conversation.entity';
import { MessageMemoryRef } from './message-memory-ref.entity';
import { Message } from './message.entity';
import { VoiceArtifact } from './voice-artifact.entity';
import { Role } from '../common/enums/role.enum';
import { MemoryRetrievalService } from './memory-retrieval.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly personasService: PersonasService,
    private readonly chatRuntimeService: ChatRuntimeService,
    private readonly aiClientService: AiClientService,
    private readonly memoriesService: MemoriesService,
    private readonly memoryRetrievalService: MemoryRetrievalService,
    private readonly audioStorageService: AudioStorageService,
    private readonly adminService: AdminService,
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(MessageMemoryRef)
    private readonly messageMemoryRefsRepository: Repository<MessageMemoryRef>,
    @InjectRepository(VoiceArtifact)
    private readonly voiceArtifactsRepository: Repository<VoiceArtifact>,
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
    const memoriesConsentContext = this.buildProviderConsentContext(
      conversation.userId,
      ConsentFeature.MEMORIES,
    );
    const voicePersonaConsentContext = this.buildProviderConsentContext(
      conversation.userId,
      ConsentFeature.VOICE_PERSONA,
    );
    const persona = await this.personasService.getActivePersona();
    const history = await this.getConversationHistory(conversation.id);
    const relatedMemories = await this.memoryRetrievalService.retrieve(
      dto.content,
      memoriesConsentContext,
    );
    const assistantReply = await this.generateAssistantReply({
      conversationId,
      persona,
      userMessage: dto.content,
      memories: relatedMemories,
      history,
      consentContext: memoriesConsentContext,
    });

    const exchange = await this.dataSource.transaction(async (manager) => {
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
        content: assistantReply.content,
        inputMode: MessageInputMode.TEXT,
        status: MessageStatus.COMPLETED,
        latencyMs: assistantReply.latencyMs,
        retrievedMemoryIds: assistantReply.retrievedMemoryIds,
      });

      const savedAssistantMessage = await manager.save(assistantMessage);
      const ttsResult = await this.generateAndStoreTtsAudio({
        conversationId,
        messageId: savedAssistantMessage.id,
        text: assistantReply.content,
        voiceId: persona.voiceId,
        consentContext: voicePersonaConsentContext,
      });
      const voiceArtifact = manager.create(VoiceArtifact, {
        messageId: savedAssistantMessage.id,
        audioInputUrl: null,
        sttText: null,
        ttsAudioUrl: ttsResult.ttsAudioUrl,
        sttStatus: 'NOT_REQUIRED',
        ttsStatus: ttsResult.ttsStatus,
        fallbackTextUsed: ttsResult.fallbackTextUsed,
      });
      const savedVoiceArtifact = await manager.save(voiceArtifact);

      if (assistantReply.retrievedMemoryIds.length > 0) {
        const refs = assistantReply.retrievedMemoryIds.map((memoryId) =>
          manager.create(MessageMemoryRef, {
            messageId: savedAssistantMessage.id,
            memoryId,
          }),
        );
        await manager.save(refs);
      }

      conversation.lastMessageAt = new Date();
      await manager.save(conversation);

      return {
        userMessage: savedUserMessage,
        assistantMessage: {
          ...savedAssistantMessage,
          ttsAudioUrl: savedVoiceArtifact.ttsAudioUrl,
          fallbackTextUsed: savedVoiceArtifact.fallbackTextUsed,
        },
      };
    });

    this.queueShortTermMemoryExtraction({
      userId: conversation.userId,
      conversationId,
      history,
      userMessage: dto.content,
      assistantMessage: assistantReply.content,
      consentContext: memoriesConsentContext,
    });

    return exchange;
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
    const memoriesConsentContext = this.buildProviderConsentContext(
      conversation.userId,
      ConsentFeature.MEMORIES,
    );
    const voicePersonaConsentContext = this.buildProviderConsentContext(
      conversation.userId,
      ConsentFeature.VOICE_PERSONA,
    );
    const persona = await this.personasService.getActivePersona();
    const sttText = await this.resolveSttText(
      conversationId,
      dto,
      file,
      memoriesConsentContext,
    );
    const history = await this.getConversationHistory(conversation.id);
    const relatedMemories = await this.memoryRetrievalService.retrieve(
      sttText,
      memoriesConsentContext,
    );
    const assistantReply = await this.generateAssistantReply({
      conversationId,
      persona,
      userMessage: sttText,
      memories: relatedMemories,
      history,
      consentContext: memoriesConsentContext,
    });

    try {
      const exchange = await this.dataSource.transaction(async (manager) => {
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
          content: assistantReply.content,
          inputMode: MessageInputMode.VOICE,
          status: MessageStatus.COMPLETED,
          latencyMs: assistantReply.latencyMs,
          retrievedMemoryIds: assistantReply.retrievedMemoryIds,
        });
        const savedAssistantMessage = await manager.save(assistantMessage);

        const ttsResult = await this.generateAndStoreTtsAudio({
          conversationId,
          messageId: savedAssistantMessage.id,
          text: assistantReply.content,
          voiceId: persona.voiceId,
          consentContext: voicePersonaConsentContext,
        });
        const voiceArtifact = manager.create(VoiceArtifact, {
          messageId: savedUserMessage.id,
          audioInputUrl: `/uploads/${Date.now()}-${file.originalname}`,
          sttText,
          ttsAudioUrl: ttsResult.ttsAudioUrl,
          sttStatus: 'COMPLETED',
          ttsStatus: ttsResult.ttsStatus,
          fallbackTextUsed: ttsResult.fallbackTextUsed,
        });
        const savedVoiceArtifact = await manager.save(voiceArtifact);

        if (assistantReply.retrievedMemoryIds.length > 0) {
          const refs = assistantReply.retrievedMemoryIds.map((memoryId) =>
            manager.create(MessageMemoryRef, {
              messageId: savedAssistantMessage.id,
              memoryId,
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

      this.queueShortTermMemoryExtraction({
        userId: conversation.userId,
        conversationId,
        history,
        userMessage: sttText,
        assistantMessage: assistantReply.content,
        consentContext: memoriesConsentContext,
      });

      return exchange;
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

  private async generateAndStoreTtsAudio(params: {
    conversationId: string;
    messageId: string;
    text: string;
    voiceId: string | null;
    consentContext: AiProviderConsentContext;
  }): Promise<{
    ttsAudioUrl: string | null;
    ttsStatus: string;
    fallbackTextUsed: boolean;
  }> {
    try {
      const audioBuffer = await this.aiClientService.synthesizeSpeech(
        params.text,
        { voiceId: params.voiceId },
        params.consentContext,
      );

      if (!audioBuffer) {
        return {
          ttsAudioUrl: null,
          ttsStatus: 'PENDING',
          fallbackTextUsed: true,
        };
      }

      const storedAudio = await this.audioStorageService.saveMp3({
        buffer: audioBuffer,
        conversationId: params.conversationId,
        messageId: params.messageId,
      });

      return {
        ttsAudioUrl: storedAudio.url,
        ttsStatus: 'COMPLETED',
        fallbackTextUsed: false,
      };
    } catch (error) {
      await this.adminService.recordLog({
        category: SystemLogCategory.TTS,
        severity: SystemLogSeverity.WARN,
        conversationId: params.conversationId,
        messageId: params.messageId,
        detail: {
          reason: 'ai_tts_failed',
          error: error instanceof Error ? error.message : 'unknown',
        },
      });

      return {
        ttsAudioUrl: null,
        ttsStatus: 'FAILED',
        fallbackTextUsed: true,
      };
    }
  }

  private async resolveSttText(
    conversationId: string,
    dto: SendVoiceMessageDto,
    file: Express.Multer.File,
    consentContext: AiProviderConsentContext,
  ): Promise<string> {
    try {
      const aiSttText = await this.aiClientService.transcribe(file, consentContext);
      if (aiSttText?.trim()) {
        return aiSttText.trim();
      }
    } catch (error) {
      await this.adminService.recordLog({
        category: SystemLogCategory.STT,
        severity: SystemLogSeverity.WARN,
        conversationId,
        detail: {
          reason: 'ai_stt_failed',
          error: error instanceof Error ? error.message : 'unknown',
        },
      });
    }

    return dto.sttText?.trim() || '음성 메시지가 전송되었습니다.';
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

  private async getConversationHistory(
    conversationId: string,
  ): Promise<AiChatHistoryItem[]> {
    const messages = await this.messagesRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return messages
      .reverse()
      .filter(
        (message) =>
          message.senderType === MessageSenderType.USER ||
          message.senderType === MessageSenderType.ASSISTANT,
      )
      .map((message) => ({
        role:
          message.senderType === MessageSenderType.USER
            ? ('user' as const)
            : ('assistant' as const),
        content: message.content,
      }));
  }

  private async generateAssistantReply(params: {
    conversationId: string;
    persona: Awaited<ReturnType<PersonasService['getActivePersona']>>;
    userMessage: string;
    memories: Memory[];
    history: AiChatHistoryItem[];
    consentContext: AiProviderConsentContext;
  }) {
    try {
      return await this.chatRuntimeService.generateAssistantReply({
        persona: params.persona,
        userMessage: params.userMessage,
        memories: params.memories,
        history: params.history,
        consentContext: params.consentContext,
      });
    } catch (error) {
      await this.adminService.recordLog({
        category: SystemLogCategory.LLM,
        severity: SystemLogSeverity.ERROR,
        conversationId: params.conversationId,
        detail: {
          reason: 'ai_chat_failed',
          error: error instanceof Error ? error.message : 'unknown',
        },
      });

      return {
        content: this.chatRuntimeService.buildFallbackAssistantReply({
          persona: params.persona,
          userMessage: params.userMessage,
          memories: params.memories,
        }),
        retrievedMemoryIds: params.memories.map((memory) => memory.id),
        latencyMs: 0,
        usedFallback: true,
      };
    }
  }

  private async extractShortTermMemory(params: {
    userId: string;
    conversationId: string;
    history: AiChatHistoryItem[];
    userMessage: string;
    assistantMessage: string;
    consentContext: AiProviderConsentContext;
  }): Promise<void> {
    try {
      const extraction = await this.aiClientService.extractMemoryCandidates(
        {
          history: params.history,
          userMessage: params.userMessage,
          assistantMessage: params.assistantMessage,
        },
        params.consentContext,
      );

      const candidates = extraction?.candidates ?? [];
      const storeableCandidates = candidates.filter(
        (candidate) => candidate.shouldStore && candidate.summary.trim(),
      );
      if (storeableCandidates.length === 0) {
        return;
      }

      for (const candidate of storeableCandidates) {
        await this.memoriesService.create(params.userId, {
          title: candidate.summary.slice(0, 120),
          memoryType: 'SHORT_TERM',
          relatedPeople: [],
          relatedPeriod: undefined,
          bodyMarkdown: candidate.summary,
          tags: [
            ...(candidate.category ? [`category:${candidate.category}`] : []),
            'source:ai_memory_extract',
          ],
          confidenceScore:
            typeof candidate.confidence === 'number'
              ? Math.max(0, Math.min(1, candidate.confidence))
              : typeof candidate.importance === 'number'
                ? Math.max(0, Math.min(1, candidate.importance / 10))
                : 0.7,
        });
      }
    } catch (error) {
      await this.adminService.recordLog({
        category: SystemLogCategory.MEMORY,
        severity: SystemLogSeverity.WARN,
        conversationId: params.conversationId,
        detail: {
          reason: 'ai_memory_extract_failed',
          error: error instanceof Error ? error.message : 'unknown',
        },
      });
    }
  }

  private queueShortTermMemoryExtraction(params: {
    userId: string;
    conversationId: string;
    history: AiChatHistoryItem[];
    userMessage: string;
    assistantMessage: string;
    consentContext: AiProviderConsentContext;
  }): void {
    setImmediate(() => {
      void this.extractShortTermMemory(params);
    });
  }

  private buildProviderConsentContext(
    ownerUserId: string,
    feature: ConsentFeature,
  ): AiProviderConsentContext {
    return {
      ownerUserId,
      feature,
      bypassConsentCheck: true,
    };
  }

}
