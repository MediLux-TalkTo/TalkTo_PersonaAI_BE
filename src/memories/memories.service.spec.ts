import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { ArrayContains } from 'typeorm';
import { AiClientService } from '../ai/ai-client.service';
import { AdminService } from '../admin/admin.service';
import { MemoryStatus } from '../common/enums/memory.enums';
import { MemoryEmbedding } from './memory-embedding.entity';
import { MemoryRevision } from './memory-revision.entity';
import { Memory } from './memory.entity';
import { MemoriesService } from './memories.service';

describe('MemoriesService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    delete: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  });

  let service: MemoriesService;
  let memoriesRepository: ReturnType<typeof repository>;
  let revisionsRepository: ReturnType<typeof repository>;
  let embeddingsRepository: ReturnType<typeof repository>;
  let aiClientService: { embed: jest.Mock };

  const memory = (overrides: Partial<Memory> = {}) =>
    ({
      id: 'memory-id',
      title: '불고기',
      memoryType: 'LONG_TERM',
      relatedPeople: ['손녀'],
      relatedPeriod: null,
      bodyMarkdown: '불고기 기억',
      tags: ['category:요리'],
      confidenceScore: 1,
      status: MemoryStatus.ACTIVE,
      createdBy: 'user-id',
      updatedBy: 'user-id',
      ...overrides,
    }) as Memory;

  beforeEach(async () => {
    memoriesRepository = repository();
    revisionsRepository = repository();
    embeddingsRepository = repository();
    aiClientService = {
      embed: jest.fn().mockResolvedValue([0.1, 0.2]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MemoriesService,
        { provide: getRepositoryToken(Memory), useValue: memoriesRepository },
        { provide: getRepositoryToken(MemoryRevision), useValue: revisionsRepository },
        { provide: getRepositoryToken(MemoryEmbedding), useValue: embeddingsRepository },
        { provide: AiClientService, useValue: aiClientService },
        { provide: AdminService, useValue: { recordLog: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(MemoriesService);
  });

  it('does not rebuild embeddings when an update only changes metadata', async () => {
    memoriesRepository.findOne.mockResolvedValue(memory());

    await service.update('editor-id', 'memory-id', {
      relatedPeople: ['손녀', '손자'],
      tags: ['category:요리', 'family'],
      confidenceScore: 0.9,
    });

    expect(embeddingsRepository.delete).not.toHaveBeenCalled();
    expect(aiClientService.embed).not.toHaveBeenCalled();
  });

  it('rebuilds embeddings when body markdown changes', async () => {
    memoriesRepository.findOne.mockResolvedValue(memory());

    await service.update('editor-id', 'memory-id', {
      bodyMarkdown: '새 불고기 기억',
    });

    expect(embeddingsRepository.delete).toHaveBeenCalledWith({ memoryId: 'memory-id' });
    expect(aiClientService.embed).toHaveBeenCalledWith('새 불고기 기억');
  });

  it('filters related people with the array contains operator', async () => {
    await service.list({ person: '손녀' });

    expect(memoriesRepository.find).toHaveBeenCalledWith({
      where: [
        {
          status: MemoryStatus.ACTIVE,
          relatedPeople: ArrayContains(['손녀']),
        },
      ],
      order: { updatedAt: 'DESC' },
    });
  });
});
