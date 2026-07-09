import { DataSource, Repository } from 'typeorm';
import { AiClientService } from '../ai/ai-client.service';
import { AdminService } from '../admin/admin.service';
import { ConsentFeature } from '../common/enums/consent.enums';
import { Role } from '../common/enums/role.enum';
import { MemoriesService } from '../memories/memories.service';
import { PersonasService } from '../personas/personas.service';
import { AudioStorageService } from '../storage/audio-storage.service';
import { ChatRuntimeService } from './chat-runtime.service';
import { Conversation } from './conversation.entity';
import { ConversationsService } from './conversations.service';
import { MemoryRetrievalService } from './memory-retrieval.service';
import { MessageMemoryRef } from './message-memory-ref.entity';
import { Message } from './message.entity';
import { VoiceArtifact } from './voice-artifact.entity';

describe('ConversationsService AI consent context', () => {
  const ownerUserId = 'owner-id';
  const memoriesConsentContext = {
    ownerUserId,
    feature: ConsentFeature.MEMORIES,
    bypassConsentCheck: true,
  };
  const voicePersonaConsentContext = {
    ownerUserId,
    feature: ConsentFeature.VOICE_PERSONA,
    bypassConsentCheck: true,
  };

  const createService = () => {
    const aiClientService = {
      extractMemoryCandidates: jest.fn().mockResolvedValue(null),
      synthesizeSpeech: jest.fn().mockResolvedValue(null),
      transcribe: jest.fn().mockResolvedValue(' 변환된 음성 '),
    };
    const memoriesService = {
      create: jest.fn(),
    };

    const service = new ConversationsService(
      {} as DataSource,
      {} as PersonasService,
      {} as ChatRuntimeService,
      aiClientService as unknown as AiClientService,
      memoriesService as unknown as MemoriesService,
      {} as MemoryRetrievalService,
      {} as AudioStorageService,
      { recordLog: jest.fn() } as unknown as AdminService,
      {} as Repository<Conversation>,
      {} as Repository<Message>,
      {} as Repository<MessageMemoryRef>,
      {} as Repository<VoiceArtifact>,
    );

    return { aiClientService, memoriesService, service };
  };

  it('passes owner Memories context to STT provider calls', async () => {
    const { aiClientService, service } = createService();
    const file = {
      buffer: Buffer.from('audio'),
      mimetype: 'audio/wav',
      originalname: 'voice.wav',
    } as Express.Multer.File;

    await expect(
      service['resolveSttText'](
        'conversation-id',
        { sttText: 'fallback' },
        file,
        memoriesConsentContext,
      ),
    ).resolves.toBe('변환된 음성');

    expect(aiClientService.transcribe).toHaveBeenCalledWith(
      file,
      memoriesConsentContext,
    );
  });

  it('passes owner Voice Persona context to TTS provider calls', async () => {
    const { aiClientService, service } = createService();

    await service['generateAndStoreTtsAudio']({
      conversationId: 'conversation-id',
      messageId: 'message-id',
      text: 'kim@example.com',
      voiceId: 'voice-id',
      consentContext: voicePersonaConsentContext,
    });

    expect(aiClientService.synthesizeSpeech).toHaveBeenCalledWith(
      'kim@example.com',
      { voiceId: 'voice-id' },
      voicePersonaConsentContext,
    );
  });

  it('passes owner Memories context to short-term memory extraction', async () => {
    const { aiClientService, service } = createService();

    await service['extractShortTermMemory']({
      userId: ownerUserId,
      conversationId: 'conversation-id',
      history: [],
      userMessage: '오늘 kim@example.com에게 전화했어',
      assistantMessage: '기억해둘게요.',
      consentContext: memoriesConsentContext,
    });

    expect(aiClientService.extractMemoryCandidates).toHaveBeenCalledWith(
      {
        history: [],
        userMessage: '오늘 kim@example.com에게 전화했어',
        assistantMessage: '기억해둘게요.',
      },
      memoriesConsentContext,
    );
  });

  it('returns a TTS URL for text assistant responses', async () => {
    const manager = {
      create: jest.fn((entity: unknown, value: unknown) => value),
      save: jest.fn(async (value: { id?: string; senderType?: string; messageId?: string }) => ({
        ...value,
        id:
          value.id ??
          (value.senderType
            ? `${value.senderType.toLowerCase()}-message-id`
            : 'voice-artifact-id'),
      })),
    };
    const dataSource = {
      transaction: jest.fn((handler) => handler(manager)),
    };
    const personasService = {
      getActivePersona: jest.fn().mockResolvedValue({
        id: 'persona-id',
        displayName: '할머니',
        description: '조립된 페르소나 프롬프트',
        voiceId: 'voice-id',
      }),
    };
    const chatRuntimeService = {
      generateAssistantReply: jest.fn().mockResolvedValue({
        content: '응답입니다.',
        retrievedMemoryIds: [],
        latencyMs: 10,
        usedFallback: false,
      }),
    };
    const aiClientService = {
      extractMemoryCandidates: jest.fn().mockResolvedValue(null),
      synthesizeSpeech: jest.fn().mockResolvedValue(Buffer.from('mp3')),
    };
    const audioStorageService = {
      saveMp3: jest.fn().mockResolvedValue({
        storageKey: 'tts/message.mp3',
        url: '/audio/tts/message.mp3',
      }),
    };
    const service = new ConversationsService(
      dataSource as unknown as DataSource,
      personasService as unknown as PersonasService,
      chatRuntimeService as unknown as ChatRuntimeService,
      aiClientService as unknown as AiClientService,
      { create: jest.fn() } as unknown as MemoriesService,
      { retrieve: jest.fn().mockResolvedValue([]) } as unknown as MemoryRetrievalService,
      audioStorageService as unknown as AudioStorageService,
      { recordLog: jest.fn() } as unknown as AdminService,
      {
        findOne: jest.fn().mockResolvedValue({
          id: 'conversation-id',
          userId: ownerUserId,
          lastMessageAt: null,
        }),
      } as unknown as Repository<Conversation>,
      { find: jest.fn().mockResolvedValue([]) } as unknown as Repository<Message>,
      {} as Repository<MessageMemoryRef>,
      {} as Repository<VoiceArtifact>,
    );

    await expect(
      service.sendTextMessage(
        'conversation-id',
        { userId: ownerUserId, role: Role.FAMILY },
        { content: '안녕' },
      ),
    ).resolves.toMatchObject({
      assistantMessage: {
        content: '응답입니다.',
        ttsAudioUrl: '/audio/tts/message.mp3',
        fallbackTextUsed: false,
      },
    });
    expect(audioStorageService.saveMp3).toHaveBeenCalledWith(
      expect.objectContaining({
        buffer: Buffer.from('mp3'),
        conversationId: 'conversation-id',
        messageId: 'assistant-message-id',
      }),
    );
  });

  it('returns a non-fallback assistant response for voice messages when AI succeeds', async () => {
    const manager = {
      create: jest.fn((entity: unknown, value: unknown) => value),
      save: jest.fn(async (value: { id?: string; senderType?: string; messageId?: string }) => ({
        ...value,
        id:
          value.id ??
          (value.senderType
            ? `${value.senderType.toLowerCase()}-message-id`
            : 'voice-artifact-id'),
      })),
    };
    const dataSource = {
      transaction: jest.fn((handler) => handler(manager)),
    };
    const personasService = {
      getActivePersona: jest.fn().mockResolvedValue({
        id: 'persona-id',
        displayName: '할머니',
        description: '조립된 페르소나 프롬프트',
        voiceId: 'voice-id',
      }),
    };
    const chatRuntimeService = {
      generateAssistantReply: jest.fn().mockResolvedValue({
        content: '그래, 아가. 여기서 잘 들려요.',
        retrievedMemoryIds: [],
        latencyMs: 10,
        usedFallback: false,
      }),
    };
    const aiClientService = {
      extractMemoryCandidates: jest.fn().mockResolvedValue(null),
      synthesizeSpeech: jest.fn().mockResolvedValue(Buffer.from('mp3')),
      transcribe: jest.fn().mockResolvedValue(' 음성으로 보낸 질문 '),
    };
    const audioStorageService = {
      saveMp3: jest.fn().mockResolvedValue({
        storageKey: 'tts/voice-message.mp3',
        url: '/audio/tts/voice-message.mp3',
      }),
    };
    const service = new ConversationsService(
      dataSource as unknown as DataSource,
      personasService as unknown as PersonasService,
      chatRuntimeService as unknown as ChatRuntimeService,
      aiClientService as unknown as AiClientService,
      { create: jest.fn() } as unknown as MemoriesService,
      { retrieve: jest.fn().mockResolvedValue([]) } as unknown as MemoryRetrievalService,
      audioStorageService as unknown as AudioStorageService,
      { recordLog: jest.fn() } as unknown as AdminService,
      {
        findOne: jest.fn().mockResolvedValue({
          id: 'conversation-id',
          userId: ownerUserId,
          lastMessageAt: null,
        }),
      } as unknown as Repository<Conversation>,
      { find: jest.fn().mockResolvedValue([]) } as unknown as Repository<Message>,
      {} as Repository<MessageMemoryRef>,
      {} as Repository<VoiceArtifact>,
    );

    await expect(
      service.sendVoiceMessage(
        'conversation-id',
        { userId: ownerUserId, role: Role.FAMILY },
        {},
        {
          buffer: Buffer.from('audio'),
          mimetype: 'audio/wav',
          originalname: 'voice.wav',
        } as Express.Multer.File,
      ),
    ).resolves.toMatchObject({
      userMessage: {
        content: '음성으로 보낸 질문',
        sttText: '음성으로 보낸 질문',
      },
      assistantMessage: {
        content: '그래, 아가. 여기서 잘 들려요.',
        ttsAudioUrl: '/audio/tts/voice-message.mp3',
        fallbackTextUsed: false,
      },
    });
    expect(chatRuntimeService.generateAssistantReply).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: '음성으로 보낸 질문',
      }),
    );
    expect(aiClientService.synthesizeSpeech).toHaveBeenCalledWith(
      '그래, 아가. 여기서 잘 들려요.',
      { voiceId: 'voice-id' },
      voicePersonaConsentContext,
    );
  });
});
