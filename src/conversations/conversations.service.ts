import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { AiChatHistoryItem, AiClientService } from '../ai/ai-client.service';
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
import { MemoryEmbedding } from '../memories/memory-embedding.entity';
import { Memory } from '../memories/memory.entity';
import { MemoriesService } from '../memories/memories.service';
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
    private readonly aiClientService: AiClientService,
    private readonly memoriesService: MemoriesService,
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
    @InjectRepository(MemoryEmbedding)
    private readonly memoryEmbeddingsRepository: Repository<MemoryEmbedding>,
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
    const history = await this.getConversationHistory(conversation.id);
    const relatedMemories = await this.retrieveMemories(dto.content);
    const assistantReply = await this.generateAssistantReply({
      conversationId,
      persona,
      userMessage: dto.content,
      memories: relatedMemories,
      history,
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
        assistantMessage: savedAssistantMessage,
      };
    });

    await this.extractShortTermMemory({
      userId: actor.userId,
      conversationId,
      history,
      userMessage: dto.content,
      assistantMessage: assistantReply.content,
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
    const persona = await this.personasService.getActivePersona();
    const sttText = await this.resolveSttText(conversationId, dto, file);
    const history = await this.getConversationHistory(conversation.id);
    const relatedMemories = await this.retrieveMemories(sttText);
    const assistantReply = await this.generateAssistantReply({
      conversationId,
      persona,
      userMessage: sttText,
      memories: relatedMemories,
      history,
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

        const voiceArtifact = manager.create(VoiceArtifact, {
          messageId: savedUserMessage.id,
          audioInputUrl: `/uploads/${Date.now()}-${file.originalname}`,
          sttText,
          ttsAudioUrl: null,
          sttStatus: 'COMPLETED',
          ttsStatus: 'PENDING',
          fallbackTextUsed: true,
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

      await this.extractShortTermMemory({
        userId: actor.userId,
        conversationId,
        history,
        userMessage: sttText,
        assistantMessage: assistantReply.content,
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

  private async resolveSttText(
    conversationId: string,
    dto: SendVoiceMessageDto,
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      const aiSttText = await this.aiClientService.transcribe(file);
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

  private async retrieveMemories(query: string): Promise<Memory[]> {
    const trimmed = query.trim();

    if (!trimmed) {
      return this.memoriesRepository.find({
        where: { status: MemoryStatus.ACTIVE },
        take: 3,
        order: { updatedAt: 'DESC' },
      });
    }

    const vectorMatches = await this.retrieveMemoriesByVector(trimmed);

    if (vectorMatches.length > 0) {
      return vectorMatches;
    }

    return this.retrieveMemoriesByKeyword(trimmed);
  }

  private async retrieveMemoriesByKeyword(query: string): Promise<Memory[]> {
    return this.memoriesRepository.find({
      where: [
        { status: MemoryStatus.ACTIVE, title: ILike(`%${query}%`) },
        { status: MemoryStatus.ACTIVE, bodyMarkdown: ILike(`%${query}%`) },
      ],
      take: 3,
      order: { updatedAt: 'DESC' },
    });
  }

  private async retrieveMemoriesByVector(query: string): Promise<Memory[]> {
    let queryEmbedding: number[] | null = null;

    try {
      queryEmbedding = await this.aiClientService.embed(query);
    } catch (error) {
      await this.adminService.recordLog({
        category: SystemLogCategory.MEMORY,
        severity: SystemLogSeverity.WARN,
        detail: {
          reason: 'query_embedding_failed',
          error: error instanceof Error ? error.message : 'unknown',
        },
      });
    }

    if (!queryEmbedding) {
      return [];
    }

    const embeddings = await this.memoryEmbeddingsRepository.find({
      where: {
        memory: {
          status: MemoryStatus.ACTIVE,
        },
      },
      relations: ['memory'],
    });
    const scores = new Map<string, { memory: Memory; score: number }>();

    for (const embedding of embeddings) {
      if (!embedding.embedding) {
        continue;
      }

      const score = this.cosineSimilarity(queryEmbedding, embedding.embedding);
      const current = scores.get(embedding.memoryId);

      if (!current || score > current.score) {
        scores.set(embedding.memoryId, {
          memory: embedding.memory,
          score,
        });
      }
    }

    return Array.from(scores.values())
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(({ memory }) => memory);
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
  }) {
    try {
      return await this.chatRuntimeService.generateAssistantReply({
        persona: params.persona,
        userMessage: params.userMessage,
        memories: params.memories,
        history: params.history,
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
  }): Promise<void> {
    try {
      const extraction = await this.aiClientService.extractMemory({
        history: params.history,
        user_message: params.userMessage,
        assistant_message: params.assistantMessage,
      });

      if (!extraction?.saved || !extraction.summary) {
        return;
      }

      await this.memoriesService.create(params.userId, {
        title: extraction.summary.slice(0, 120),
        memoryType: extraction.memory_type ?? 'SHORT_TERM',
        relatedPeople: [],
        relatedPeriod: undefined,
        bodyMarkdown: extraction.summary,
        tags: [
          ...(extraction.category ? [`category:${extraction.category}`] : []),
          'source:ai_memory_extract',
        ],
        confidenceScore:
          typeof extraction.importance === 'number'
            ? Math.max(0, Math.min(1, extraction.importance / 10))
            : 0.7,
      });
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

  private cosineSimilarity(left: number[], right: number[]): number {
    if (left.length !== right.length || left.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;

    for (let index = 0; index < left.length; index += 1) {
      dotProduct += left[index] * right[index];
      leftMagnitude += left[index] ** 2;
      rightMagnitude += right[index] ** 2;
    }

    const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);

    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
