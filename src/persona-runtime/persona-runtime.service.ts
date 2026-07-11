import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiClientService } from '../ai/ai-client.service';
import { AnalysisEmbedding } from '../analysis/analysis-embedding.entity';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { ConsentFeature } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { PersonaBible } from '../voice-persona/persona-bible.entity';
import { VoicePersonaReviewStatus } from '../voice-persona/voice-persona.constants';
import { AudioStorageService } from '../storage/audio-storage.service';
import { PersonaRuntimeConfig } from '../voice-persona/persona-runtime-config.entity';
import { VoiceProviderAsset } from '../voice-persona/voice-provider-asset.entity';
import { CreatePersonaRuntimeMessageDto, CreatePersonaRuntimeSessionDto } from './dto/persona-runtime.dto';
import { PersonaRuntimeMessage } from './persona-runtime-message.entity';
import { PersonaRuntimeSession } from './persona-runtime-session.entity';

const SESSION_USAGE_LIMIT = 50;
const RUNTIME_MEMORY_LIMIT = 5;
const LOW_CONFIDENCE_THRESHOLD = 0.18;
const BLOCKED_TOPIC_PATTERN = /\b(suicide|self-harm|kill|weapon|violence)\b|자살|자해|살해|무기|폭력/i;

@Injectable()
export class PersonaRuntimeService {
  constructor(
    @InjectRepository(PersonaRuntimeSession)
    private readonly sessionsRepository: Repository<PersonaRuntimeSession>,
    @InjectRepository(PersonaRuntimeMessage)
    private readonly messagesRepository: Repository<PersonaRuntimeMessage>,
    @InjectRepository(PersonaRuntimeConfig)
    private readonly runtimeConfigsRepository: Repository<PersonaRuntimeConfig>,
    @InjectRepository(MemorySegment)
    private readonly memorySegmentsRepository: Repository<MemorySegment>,
    @InjectRepository(AnalysisEmbedding)
    private readonly embeddingsRepository: Repository<AnalysisEmbedding>,
    @InjectRepository(PersonaBible)
    private readonly personaBiblesRepository: Repository<PersonaBible>,
    @InjectRepository(VoiceProviderAsset)
    private readonly providerAssetsRepository: Repository<VoiceProviderAsset>,
    private readonly consentsService: ConsentsService,
    private readonly aiClientService: AiClientService,
    private readonly audioStorageService: AudioStorageService,
    private readonly appEventsService: AppEventsService,
  ) {}

  async createSession(ownerUserId: string, dto: CreatePersonaRuntimeSessionDto) {
    const runtimeConfig = await this.loadEnabledRuntimeConfig(
      dto.applicationId,
      ownerUserId,
    );
    await this.consentsService.assertRequiredConsents(
      ownerUserId,
      ConsentFeature.VOICE_PERSONA,
      runtimeConfig.subjectId,
    );
    const session = await this.sessionsRepository.save(
      this.sessionsRepository.create({
        ownerUserId,
        applicationId: dto.applicationId,
        subjectId: runtimeConfig.subjectId,
        runtimeConfigId: runtimeConfig.id,
        usageCount: 0,
      }),
    );
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'persona_runtime.session_created',
      subjectId: session.subjectId,
      payload: { applicationId: dto.applicationId, sessionId: session.id },
    });
    return session;
  }

  async createMessage(
    sessionId: string,
    ownerUserId: string,
    dto: CreatePersonaRuntimeMessageDto,
  ) {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId, ownerUserId },
    });
    if (!session) {
      throw new NotFoundException('Persona runtime session not found.');
    }
    if (session.usageCount >= SESSION_USAGE_LIMIT) {
      throw new BadRequestException({
        code: 'usage_limit_exceeded',
        message: 'Persona runtime usage limit has been reached.',
      });
    }
    const runtimeConfig = await this.loadEnabledRuntimeConfig(
      session.applicationId,
      ownerUserId,
    );
    await this.messagesRepository.save(
      this.messagesRepository.create({
        sessionId,
        ownerUserId,
        role: 'user',
        text: dto.text,
        sourceSegmentIds: [],
        safetyStatus: 'allowed',
      }),
    );

    const assistantDraft = BLOCKED_TOPIC_PATTERN.test(dto.text)
      ? await this.blockedResponse(session, ownerUserId)
      : await this.answerWithRag(session, runtimeConfig, ownerUserId, dto.text);
    const assistantMessage = await this.messagesRepository.save(
      this.messagesRepository.create(assistantDraft),
    );
    const audio = await this.trySynthesizeAudio(
      assistantMessage,
      session.subjectId,
      ownerUserId,
      await this.loadVoiceId(runtimeConfig),
    );
    if (audio) {
      assistantMessage.audioStorageKey = audio.audioStorageKey;
      assistantMessage.audioPlaybackUrl = audio.audioPlaybackUrl;
      await this.messagesRepository.save(assistantMessage);
    }
    session.usageCount += 1;
    await this.sessionsRepository.save(session);
    return {
      message: assistantMessage,
      sourceSegments: assistantDraft.sourceSegmentIds,
      safetyStatus: assistantDraft.safetyStatus,
      audioPlaybackUrl: assistantMessage.audioPlaybackUrl,
      usage: {
        used: session.usageCount,
        limit: SESSION_USAGE_LIMIT,
      },
    };
  }

  private async blockedResponse(
    session: PersonaRuntimeSession,
    ownerUserId: string,
  ): Promise<Partial<PersonaRuntimeMessage>> {
    return {
      sessionId: session.id,
      ownerUserId,
      role: 'assistant',
      text: 'I cannot help with that topic, but I can share safe family memories or general support.',
      sourceSegmentIds: [],
      safetyStatus: 'blocked',
      audioStorageKey: null,
      audioPlaybackUrl: null,
    };
  }

  private async answerWithRag(
    session: PersonaRuntimeSession,
    runtimeConfig: PersonaRuntimeConfig,
    ownerUserId: string,
    text: string,
  ): Promise<Partial<PersonaRuntimeMessage>> {
    const [segments, bible, voiceId] = await Promise.all([
      this.retrieveRuntimeMemories(session, ownerUserId, text),
      this.loadRuntimeBible(runtimeConfig),
      this.loadVoiceId(runtimeConfig),
    ]);
    if (!bible?.assembledInstructions) {
      throw new BadRequestException({
        code: 'persona_bible_not_approved',
        message: 'Approved Persona Bible instructions are required before runtime use.',
      });
    }
    const aiResponse = await this.aiClientService.chat(
      {
        message: text,
        history: [],
        memories: segments.map((segment) => ({
          id: segment.id,
          title: `Memory ${segment.segmentIndex}`,
          content: segment.memoryText,
        })),
        persona: {
          subjectId: runtimeConfig.subjectId,
          instructions: bible.assembledInstructions,
          voiceId,
        },
      },
      {
        ownerUserId,
        subjectId: session.subjectId,
        feature: ConsentFeature.VOICE_PERSONA,
      },
    );
    const sourceSegmentIds = segments.map((segment) => segment.id);
    return {
      sessionId: session.id,
      ownerUserId,
      role: 'assistant',
      text:
        aiResponse?.content ??
        'I can answer from the approved Persona context, but I do not have enough supported detail for that yet.',
      sourceSegmentIds,
      safetyStatus: aiResponse ? 'allowed' : 'fallback',
      audioStorageKey: null,
      audioPlaybackUrl: null,
    };
  }

  private async trySynthesizeAudio(
    message: PersonaRuntimeMessage,
    subjectId: string,
    ownerUserId: string,
    voiceId: string | null,
  ): Promise<{ audioStorageKey: string; audioPlaybackUrl: string } | null> {
    const audioBuffer = await this.aiClientService.synthesizeSpeech(
      message.text,
      { voiceId },
      {
        ownerUserId,
        subjectId,
        feature: ConsentFeature.VOICE_PERSONA,
      },
    );
    if (!audioBuffer) {
      return null;
    }
    const stored = await this.audioStorageService.saveMp3({
      buffer: audioBuffer,
      conversationId: message.sessionId,
      messageId: message.id,
    });
    return {
      audioStorageKey: stored.storageKey,
      audioPlaybackUrl: stored.url,
    };
  }

  private async retrieveRuntimeMemories(
    session: PersonaRuntimeSession,
    ownerUserId: string,
    text: string,
  ): Promise<MemorySegment[]> {
    const queryEmbedding = await this.aiClientService.embed(text, {
      ownerUserId,
      subjectId: session.subjectId,
      feature: ConsentFeature.VOICE_PERSONA,
    });
    if (!queryEmbedding) {
      return this.memorySegmentsRepository.find({
        where: { ownerUserId, subjectId: session.subjectId },
        order: { updatedAt: 'DESC' },
        take: RUNTIME_MEMORY_LIMIT,
      });
    }
    const embeddings = await this.embeddingsRepository.find({
      where: { ownerUserId, subjectId: session.subjectId },
      relations: ['memorySegment'],
      take: 500,
    });
    return embeddings
      .filter(
        (embedding): embedding is AnalysisEmbedding & { memorySegment: MemorySegment } =>
          Boolean(embedding.memorySegment),
      )
      .map((embedding) => ({
        score: cosineSimilarity(queryEmbedding, embedding.embedding),
        segment: embedding.memorySegment,
      }))
      .filter((result) => result.score >= LOW_CONFIDENCE_THRESHOLD)
      .sort((left, right) => right.score - left.score)
      .slice(0, RUNTIME_MEMORY_LIMIT)
      .map((result) => result.segment);
  }

  private async loadRuntimeBible(
    runtimeConfig: PersonaRuntimeConfig,
  ): Promise<PersonaBible | null> {
    return this.personaBiblesRepository
      .createQueryBuilder('bible')
      .addSelect('bible.assembledInstructions')
      .where('bible.id = :personaBibleId', {
        personaBibleId: runtimeConfig.personaBibleId,
      })
      .andWhere('bible.ownerUserId = :ownerUserId', {
        ownerUserId: runtimeConfig.ownerUserId,
      })
      .andWhere('bible.reviewStatus = :reviewStatus', {
        reviewStatus: VoicePersonaReviewStatus.APPROVED,
      })
      .getOne();
  }

  private async loadVoiceId(
    runtimeConfig: PersonaRuntimeConfig,
  ): Promise<string | null> {
    if (!runtimeConfig.providerAssetId) {
      return null;
    }
    const asset = await this.providerAssetsRepository.findOne({
      where: {
        id: runtimeConfig.providerAssetId,
        ownerUserId: runtimeConfig.ownerUserId,
        subjectId: runtimeConfig.subjectId,
      },
    });
    return asset?.externalAssetId ?? null;
  }

  private async loadEnabledRuntimeConfig(
    applicationId: string,
    ownerUserId: string,
  ) {
    const runtimeConfig = await this.runtimeConfigsRepository.findOne({
      where: { applicationId, ownerUserId, enabled: true },
    });
    if (!runtimeConfig) {
      throw new ForbiddenException({
        code: 'persona_not_enabled',
        message: 'Voice Persona runtime is not enabled yet.',
      });
    }
    return runtimeConfig;
  }
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? 0 : dot / denominator;
}
