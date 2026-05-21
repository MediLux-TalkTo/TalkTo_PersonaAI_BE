import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AiClientService } from '../ai/ai-client.service';
import { AdminService } from '../admin/admin.service';
import { MemoryStatus } from '../common/enums/memory.enums';
import { MemoryEmbedding } from '../memories/memory-embedding.entity';
import { Memory } from '../memories/memory.entity';
import { MemoryRetrievalService } from './memory-retrieval.service';

describe('MemoryRetrievalService', () => {
  const repository = () => ({
    find: jest.fn().mockResolvedValue([]),
  });

  let service: MemoryRetrievalService;
  let memoriesRepository: ReturnType<typeof repository>;
  let memoryEmbeddingsRepository: ReturnType<typeof repository>;
  let aiClientService: { embed: jest.Mock };
  let adminService: { recordLog: jest.Mock };

  beforeEach(async () => {
    memoriesRepository = repository();
    memoryEmbeddingsRepository = repository();
    aiClientService = { embed: jest.fn() };
    adminService = { recordLog: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MemoryRetrievalService,
        { provide: getRepositoryToken(Memory), useValue: memoriesRepository },
        {
          provide: getRepositoryToken(MemoryEmbedding),
          useValue: memoryEmbeddingsRepository,
        },
        { provide: AiClientService, useValue: aiClientService },
        { provide: AdminService, useValue: adminService },
      ],
    }).compile();

    service = moduleRef.get(MemoryRetrievalService);
  });

  it('returns the strongest vector matches when embeddings are available', async () => {
    const betterMemory = { id: 'memory-strong' } as Memory;
    const weakerMemory = { id: 'memory-weak' } as Memory;
    aiClientService.embed.mockResolvedValue([1, 0]);
    memoryEmbeddingsRepository.find.mockResolvedValue([
      {
        memoryId: weakerMemory.id,
        memory: weakerMemory,
        embedding: [0.2, 0.8],
      },
      {
        memoryId: betterMemory.id,
        memory: betterMemory,
        embedding: [1, 0],
      },
    ]);

    await expect(service.retrieve('불고기')).resolves.toEqual([
      betterMemory,
      weakerMemory,
    ]);
    expect(memoriesRepository.find).not.toHaveBeenCalled();
  });

  it('falls back to keyword retrieval when query embedding fails', async () => {
    const keywordMemories = [{ id: 'keyword-memory' }] as Memory[];
    aiClientService.embed.mockRejectedValue(new Error('embed down'));
    memoriesRepository.find.mockResolvedValue(keywordMemories);

    await expect(service.retrieve('불고기')).resolves.toEqual(keywordMemories);
    expect(adminService.recordLog).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ reason: 'query_embedding_failed' }),
      }),
    );
    expect(memoriesRepository.find).toHaveBeenCalledWith({
      where: [
        { status: MemoryStatus.ACTIVE, title: expect.anything() },
        { status: MemoryStatus.ACTIVE, bodyMarkdown: expect.anything() },
      ],
      take: 3,
      order: { updatedAt: 'DESC' },
    });
  });
});
