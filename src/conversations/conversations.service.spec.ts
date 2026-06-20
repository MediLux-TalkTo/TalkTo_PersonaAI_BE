import { DataSource, Repository } from 'typeorm';
import { AiClientService } from '../ai/ai-client.service';
import { AdminService } from '../admin/admin.service';
import { ConsentFeature } from '../common/enums/consent.enums';
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
  };
  const voicePersonaConsentContext = {
    ownerUserId,
    feature: ConsentFeature.VOICE_PERSONA,
  };

  const createService = () => {
    const aiClientService = {
      extractMemory: jest.fn().mockResolvedValue(null),
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
      consentContext: voicePersonaConsentContext,
    });

    expect(aiClientService.synthesizeSpeech).toHaveBeenCalledWith(
      'kim@example.com',
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

    expect(aiClientService.extractMemory).toHaveBeenCalledWith(
      {
        history: [],
        user_message: '오늘 kim@example.com에게 전화했어',
        assistant_message: '기억해둘게요.',
      },
      memoriesConsentContext,
    );
  });
});
