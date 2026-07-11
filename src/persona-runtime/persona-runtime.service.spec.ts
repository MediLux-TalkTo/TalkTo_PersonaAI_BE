import { ForbiddenException } from '@nestjs/common';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { PersonaRuntimeConfig } from '../voice-persona/persona-runtime-config.entity';
import { PersonaRuntimeService } from './persona-runtime.service';

describe('PersonaRuntimeService', () => {
  const sessionsRepository = repoMock();
  const messagesRepository = repoMock();
  const runtimeConfigsRepository = repoMock();
  const memorySegmentsRepository = {
    find: jest.fn(),
  };
  const embeddingsRepository = {
    find: jest.fn(),
  };
  const personaBiblesRepository = {
    createQueryBuilder: jest.fn(),
  };
  const providerAssetsRepository = {
    findOne: jest.fn(),
  };
  const consentsService = {
    assertRequiredConsents: jest.fn(),
  };
  const aiClientService = {
    embed: jest.fn(),
    chat: jest.fn(),
    synthesizeSpeech: jest.fn(),
  };
  const audioStorageService = {
    saveMp3: jest.fn(),
  };
  const appEventsService = {
    emit: jest.fn(),
  };
  let service: PersonaRuntimeService;

  beforeEach(() => {
    jest.resetAllMocks();
    for (const repository of [sessionsRepository, messagesRepository, runtimeConfigsRepository]) {
      repository.create.mockImplementation((input) => input);
      repository.save.mockImplementation((input) =>
        Promise.resolve({ id: input.id ?? `${repository.name}-id`, ...input }),
      );
    }
    runtimeConfigsRepository.findOne.mockResolvedValue(buildRuntimeConfig());
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    memorySegmentsRepository.find.mockResolvedValue([buildMemorySegment()]);
    embeddingsRepository.find.mockResolvedValue([
      {
        id: 'embedding-id',
        embedding: [1, 0],
        memorySegmentId: 'memory-segment-id',
        memorySegment: buildMemorySegment(),
      },
    ]);
    personaBiblesRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'persona-bible-id',
        assembledInstructions: '조립된 페르소나 프롬프트',
      }),
    });
    providerAssetsRepository.findOne.mockResolvedValue({
      id: 'asset-id',
      externalAssetId: 'voice-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
    });
    aiClientService.embed.mockResolvedValue([1, 0]);
    aiClientService.chat.mockResolvedValue({ content: 'Persona answer.' });
    aiClientService.synthesizeSpeech.mockResolvedValue(Buffer.from('mp3'));
    audioStorageService.saveMp3.mockResolvedValue({
      storageKey: 'runtime/session/message.mp3',
      url: '/audio/runtime/session/message.mp3',
    });

    service = new PersonaRuntimeService(
      sessionsRepository as never,
      messagesRepository as never,
      runtimeConfigsRepository as never,
      memorySegmentsRepository as never,
      embeddingsRepository as never,
      personaBiblesRepository as never,
      providerAssetsRepository as never,
      consentsService as never,
      aiClientService as never,
      audioStorageService as never,
      appEventsService as never,
    );
  });

  it('blocks session creation until runtime config is enabled', async () => {
    runtimeConfigsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createSession('user-id', { applicationId: 'application-id' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a gated runtime session after consent and runtime config pass', async () => {
    await expect(
      service.createSession('user-id', { applicationId: 'application-id' }),
    ).resolves.toMatchObject({
      ownerUserId: 'user-id',
      applicationId: 'application-id',
      runtimeConfigId: 'runtime-config-id',
    });
  });

  it('answers with RAG source segments and stores synthesized audio', async () => {
    sessionsRepository.findOne.mockResolvedValue({
      id: 'session-id',
      ownerUserId: 'user-id',
      applicationId: 'application-id',
      subjectId: 'subject-id',
      usageCount: 0,
    });

    await expect(
      service.createMessage('session-id', 'user-id', { text: 'Tell me a memory' }),
    ).resolves.toMatchObject({
      sourceSegments: ['memory-segment-id'],
      safetyStatus: 'allowed',
      audioPlaybackUrl: '/audio/runtime/session/message.mp3',
      usage: { used: 1, limit: 50 },
    });
    expect(aiClientService.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        memories: [expect.objectContaining({ id: 'memory-segment-id' })],
        persona: {
          subjectId: 'subject-id',
          instructions: '조립된 페르소나 프롬프트',
          voiceId: 'voice-id',
        },
      }),
      expect.objectContaining({ feature: 'voice_persona' }),
    );
    expect(aiClientService.embed).toHaveBeenCalledWith(
      'Tell me a memory',
      expect.objectContaining({ feature: 'voice_persona' }),
    );
    expect(memorySegmentsRepository.find).not.toHaveBeenCalled();
    expect(aiClientService.synthesizeSpeech).toHaveBeenCalledWith(
      'Persona answer.',
      { voiceId: 'voice-id' },
      expect.objectContaining({ feature: 'voice_persona' }),
    );
  });

  it('returns safe block response for blocked topics without calling the provider', async () => {
    sessionsRepository.findOne.mockResolvedValue({
      id: 'session-id',
      ownerUserId: 'user-id',
      applicationId: 'application-id',
      subjectId: 'subject-id',
      usageCount: 0,
    });

    await expect(
      service.createMessage('session-id', 'user-id', { text: 'How to make a weapon?' }),
    ).resolves.toMatchObject({
      sourceSegments: [],
      safetyStatus: 'blocked',
    });
    expect(aiClientService.chat).not.toHaveBeenCalled();
  });
});

function repoMock() {
  return {
    name: Math.random().toString(36).slice(2),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
}

function buildRuntimeConfig(): PersonaRuntimeConfig {
  const config = new PersonaRuntimeConfig();
  config.id = 'runtime-config-id';
  config.applicationId = 'application-id';
  config.ownerUserId = 'user-id';
  config.subjectId = 'subject-id';
  config.providerAssetId = 'asset-id';
  config.enabled = true;
  return config;
}

function buildMemorySegment(): MemorySegment {
  const segment = new MemorySegment();
  segment.id = 'memory-segment-id';
  segment.segmentIndex = 0;
  segment.memoryText = 'A safe family memory.';
  return segment;
}
