import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiClientService } from '../ai/ai-client.service';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { ConsentFeature } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { AudioStorageService } from '../storage/audio-storage.service';
import { PersonaRuntimeConfig } from '../voice-persona/persona-runtime-config.entity';
import { CreatePersonaRuntimeMessageDto, CreatePersonaRuntimeSessionDto } from './dto/persona-runtime.dto';
import { PersonaRuntimeMessage } from './persona-runtime-message.entity';
import { PersonaRuntimeSession } from './persona-runtime-session.entity';

const SESSION_USAGE_LIMIT = 50;
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
    await this.loadEnabledRuntimeConfig(session.applicationId, ownerUserId);
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
      : await this.answerWithRag(session, ownerUserId, dto.text);
    const assistantMessage = await this.messagesRepository.save(
      this.messagesRepository.create(assistantDraft),
    );
    const audio = await this.trySynthesizeAudio(
      assistantMessage,
      session.subjectId,
      ownerUserId,
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
    ownerUserId: string,
    text: string,
  ): Promise<Partial<PersonaRuntimeMessage>> {
    const segments = await this.memorySegmentsRepository.find({
      where: { ownerUserId, subjectId: session.subjectId },
      order: { updatedAt: 'DESC' },
      take: 3,
    });
    const aiResponse = await this.aiClientService.chat(
      {
        message: text,
        history: [],
        memories: segments.map((segment) => ({
          id: segment.id,
          title: `Memory ${segment.segmentIndex}`,
          content: segment.memoryText,
        })),
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
  ): Promise<{ audioStorageKey: string; audioPlaybackUrl: string } | null> {
    const audioBuffer = await this.aiClientService.synthesizeSpeech(message.text, {
      ownerUserId,
      subjectId,
      feature: ConsentFeature.VOICE_PERSONA,
    });
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
