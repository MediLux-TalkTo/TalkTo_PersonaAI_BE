import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AiClientService } from '../ai/ai-client.service';
import { AnalysisEmbedding } from '../analysis/analysis-embedding.entity';
import { AnalysisJob } from '../analysis/analysis-job.entity';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { ConsentFeature } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { Entitlement } from '../payments/entitlement.entity';
import { EntitlementStatus } from '../payments/payment-event.constants';
import { ProductFeature } from '../products/product.constants';
import { MemoriesSearchService } from './memories-search.service';

describe('MemoriesSearchService', () => {
  const memorySegmentsRepository = {
    count: jest.fn(),
    find: jest.fn(),
  };
  const embeddingsRepository = {
    find: jest.fn(),
  };
  const analysisJobsRepository = {
    count: jest.fn(),
    find: jest.fn(),
  };
  const entitlementsRepository = {
    find: jest.fn(),
  };
  const consentsService = {
    assertRequiredConsents: jest.fn(),
  };
  const aiClientService = {
    embed: jest.fn(),
  };
  let service: MemoriesSearchService;

  beforeEach(async () => {
    jest.resetAllMocks();
    memorySegmentsRepository.count.mockResolvedValue(1);
    memorySegmentsRepository.find.mockResolvedValue([
      buildSegment({
        id: 'segment-1',
        memoryText: 'Grandmother loved spring flowers and mountain walks.',
      }),
      buildSegment({
        id: 'segment-2',
        memoryText: 'A low relevance segment about dinner.',
      }),
    ]);
    embeddingsRepository.find.mockResolvedValue([
      buildEmbedding('segment-1', [1, 0, 0]),
      buildEmbedding('segment-2', [0, 1, 0]),
    ]);
    analysisJobsRepository.count.mockResolvedValue(1);
    analysisJobsRepository.find.mockResolvedValue([
      { completedAt: new Date('2026-06-18T00:00:00.000Z') },
    ]);
    entitlementsRepository.find.mockResolvedValue([
      {
        ownerUserId: 'user-id',
        feature: ProductFeature.MEMORIES,
        status: EntitlementStatus.ACTIVE,
        endsAt: null,
      },
    ]);
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    aiClientService.embed.mockResolvedValue([1, 0, 0]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        MemoriesSearchService,
        {
          provide: getRepositoryToken(MemorySegment),
          useValue: memorySegmentsRepository,
        },
        {
          provide: getRepositoryToken(AnalysisEmbedding),
          useValue: embeddingsRepository,
        },
        {
          provide: getRepositoryToken(AnalysisJob),
          useValue: analysisJobsRepository,
        },
        { provide: getRepositoryToken(Entitlement), useValue: entitlementsRepository },
        { provide: ConsentsService, useValue: consentsService },
        { provide: AiClientService, useValue: aiClientService },
      ],
    }).compile();

    service = moduleRef.get(MemoriesSearchService);
  });

  it('returns status without using legacy memories CRUD', async () => {
    await expect(service.getStatus('user-id', {})).resolves.toEqual({
      entitled: true,
      searchable: true,
      indexedSegmentCount: 1,
      completedJobCount: 1,
      latestCompletedAt: '2026-06-18T00:00:00.000Z',
    });

    expect(memorySegmentsRepository.count).toHaveBeenCalledWith({
      where: { ownerUserId: 'user-id' },
    });
  });

  it('blocks search without an active Memories entitlement before reading segments', async () => {
    entitlementsRepository.find.mockResolvedValue([]);

    await expect(
      service.search('user-id', { q: 'spring flowers' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'requires_active_entitlement',
      }),
    });

    expect(consentsService.assertRequiredConsents).not.toHaveBeenCalled();
    expect(memorySegmentsRepository.find).not.toHaveBeenCalled();
  });

  it('checks Memories consent and returns ranked segment results with low-confidence flags', async () => {
    await expect(
      service.search('user-id', {
        q: 'spring flowers',
        subjectId: 'subject-id',
        limit: 1,
      }),
    ).resolves.toMatchObject({
      status: 'answered',
      resultCount: 1,
      lowConfidence: false,
      segments: [
        {
          id: 'segment-1',
          score: 1,
          lowConfidence: false,
        },
      ],
    });

    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.MEMORIES,
      'subject-id',
    );
    expect(aiClientService.embed).toHaveBeenCalledWith('spring flowers', {
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
      feature: ConsentFeature.MEMORIES,
    });
    expect(memorySegmentsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerUserId: 'user-id',
          subjectId: 'subject-id',
        }),
      }),
    );
  });

  it('returns a safe no-result response for paid indexed subjects with no match', async () => {
    memorySegmentsRepository.find.mockResolvedValue([
      buildSegment({ id: 'segment-3', memoryText: 'Only unrelated words.' }),
    ]);
    embeddingsRepository.find.mockResolvedValue([]);
    aiClientService.embed.mockResolvedValue(null);

    await expect(service.search('user-id', { q: '진달래 산책' })).resolves.toEqual({
      status: 'no_results',
      answer: 'No indexed Memories matched this question yet.',
      resultCount: 0,
      segments: [],
      lowConfidence: true,
    });
  });
});

function buildSegment(overrides: Partial<MemorySegment>): MemorySegment {
  return {
    id: 'segment-id',
    jobId: 'job-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    recordingId: 'recording-id',
    segmentIndex: 0,
    sourceTranscriptSegmentIds: [],
    startMs: 1000,
    endMs: 5000,
    speakerLabel: 'unknown',
    memoryText: 'A memory segment.',
    createdAt: new Date('2026-06-18T00:00:00.000Z'),
    updatedAt: new Date('2026-06-18T00:00:00.000Z'),
    ...overrides,
  } as MemorySegment;
}

function buildEmbedding(
  memorySegmentId: string,
  embedding: number[],
): AnalysisEmbedding {
  return {
    id: `${memorySegmentId}-embedding`,
    jobId: 'job-id',
    memorySegmentId,
    memorySegment: buildSegment({ id: memorySegmentId }),
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    recordingId: 'recording-id',
    embeddingIndex: 0,
    provider: 'fixture',
    model: 'fixture',
    dimensions: embedding.length,
    embedding,
    createdAt: new Date('2026-06-18T00:00:00.000Z'),
  } as AnalysisEmbedding;
}
