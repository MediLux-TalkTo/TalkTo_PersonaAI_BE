import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { In, LessThanOrEqual } from 'typeorm';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../common/enums/archive.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { Entitlement } from '../payments/entitlement.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Order } from '../orders/order.entity';
import { Recording, RecordingArchiveStatus } from '../recordings/recording.entity';
import { AnalysisEmbedding } from './analysis-embedding.entity';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisJob } from './analysis-job.entity';
import { AnalysisJobsService } from './analysis-jobs.service';
import { AnalysisWorkerTransitionsService } from './analysis-worker-transitions.service';
import { MemorySegment } from './memory-segment.entity';
import { TranscriptSegment } from './transcript-segment.entity';

describe('AnalysisWorkerTransitionsService idempotency', () => {
  const jobsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value: AnalysisJob) => value),
  };
  const recordingsRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value: Recording) => value),
  };
  const transcriptSegmentsRepository = { upsert: jest.fn() };
  const memorySegmentsRepository = { upsert: jest.fn() };
  const embeddingsRepository = { upsert: jest.fn() };
  const noopRepository = { findOne: jest.fn() };
  const consentsService = { assertRequiredConsents: jest.fn() };
  const appEventsService = { emit: jest.fn() };
  const notificationsService = {
    notifyAnalysisCompleted: jest.fn(),
    notifyAnalysisFailed: jest.fn(),
  };
  let workerService: AnalysisWorkerTransitionsService;
  let jobsService: AnalysisJobsService;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-18T00:00:00.000Z'));
    jest.resetAllMocks();
    jobsRepository.find.mockResolvedValue([]);
    jobsRepository.findOne.mockResolvedValue(buildJob());
    jobsRepository.save.mockImplementation(async (value: AnalysisJob) => value);
    recordingsRepository.findOne.mockResolvedValue(buildRecording());
    recordingsRepository.save.mockImplementation(async (value: Recording) => value);
    transcriptSegmentsRepository.upsert.mockResolvedValue({});
    memorySegmentsRepository.upsert.mockResolvedValue({});
    embeddingsRepository.upsert.mockResolvedValue({});
    notificationsService.notifyAnalysisCompleted.mockResolvedValue(null);
    notificationsService.notifyAnalysisFailed.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalysisWorkerTransitionsService,
        AnalysisJobsService,
        { provide: getRepositoryToken(AnalysisJob), useValue: jobsRepository },
        { provide: getRepositoryToken(Recording), useValue: recordingsRepository },
        { provide: getRepositoryToken(TranscriptSegment), useValue: transcriptSegmentsRepository },
        { provide: getRepositoryToken(MemorySegment), useValue: memorySegmentsRepository },
        { provide: getRepositoryToken(AnalysisEmbedding), useValue: embeddingsRepository },
        { provide: getRepositoryToken(Entitlement), useValue: noopRepository },
        { provide: getRepositoryToken(Order), useValue: noopRepository },
        { provide: ConsentsService, useValue: consentsService },
        { provide: AppEventsService, useValue: appEventsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    workerService = moduleRef.get(AnalysisWorkerTransitionsService);
    jobsService = moduleRef.get(AnalysisJobsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('upserts STT segment rows when a worker repeats the current STT state', async () => {
    jobsRepository.findOne.mockResolvedValue(buildJob({
      status: AnalysisJobStatus.STT_PROCESSING,
    }));

    await expect(workerService.markStt('job-id', {
      segments: [{
        segmentIndex: 0,
        startMs: 0,
        endMs: 2500,
        transcriptText: 'Repeated transcript.',
      }],
    })).resolves.toMatchObject({ status: AnalysisJobStatus.STT_PROCESSING });

    expect(transcriptSegmentsRepository.upsert).toHaveBeenCalledWith([
      expect.objectContaining({ jobId: 'job-id', segmentIndex: 0 }),
    ], expect.objectContaining({ conflictPaths: ['jobId', 'segmentIndex'] }));
  });

  it('upserts segmenting and indexing artifacts on repeated same-state calls', async () => {
    jobsRepository.findOne
      .mockResolvedValueOnce(buildJob({ status: AnalysisJobStatus.SEGMENTING }))
      .mockResolvedValueOnce(buildJob({ status: AnalysisJobStatus.INDEXING }));

    await workerService.markSegmenting('job-id', {
      segments: [{
        segmentIndex: 0,
        sourceTranscriptSegmentIds: ['11111111-1111-4111-8111-111111111111'],
        startMs: 0,
        endMs: 2500,
        memoryText: 'Repeated memory.',
      }],
    });
    await workerService.markIndexing('job-id', {
      embeddings: [{
        memorySegmentId: '22222222-2222-4222-8222-222222222222',
        embeddingIndex: 0,
        provider: 'synthetic',
        model: 'unit-test',
        dimensions: 3,
        embedding: [0.1, 0.2, 0.3],
      }],
    });

    expect(memorySegmentsRepository.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ jobId: 'job-id', segmentIndex: 0 })],
      expect.objectContaining({ conflictPaths: ['jobId', 'segmentIndex'] }),
    );
    expect(embeddingsRepository.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ jobId: 'job-id', embeddingIndex: 0 })],
      expect.objectContaining({ conflictPaths: ['jobId', 'embeddingIndex'] }),
    );
  });

  it('sets a preprocessing lease expiry that the lease expirer can terminalize', async () => {
    const leasedJob = await workerService.markPreprocessing('job-id', {
      workerId: 'worker-1',
    });
    const expiryCheckTime = new Date('2026-06-18T00:16:00.000Z');
    expect(leasedJob.leaseExpiresAt).toEqual(new Date('2026-06-18T00:15:00.000Z'));
    jobsRepository.find.mockImplementation(async () => (
      leasedJob.leaseExpiresAt && leasedJob.leaseExpiresAt <= expiryCheckTime
        ? [leasedJob]
        : []
    ));

    await expect(jobsService.markExpiredLeases(expiryCheckTime)).resolves.toEqual([
      expect.objectContaining({
        status: AnalysisJobStatus.FAILED_RETRYABLE,
        failureCode: 'lease_timeout',
        leaseOwner: null,
        leaseExpiresAt: null,
      }),
    ]);
    expect(jobsRepository.find).toHaveBeenCalledWith({
      where: {
        status: In(expect.any(Array)),
        leaseExpiresAt: LessThanOrEqual(expiryCheckTime),
      },
    });
  });

  it('refreshes a stale lease when STT processing starts', async () => {
    jobsRepository.findOne.mockResolvedValue(buildJob({
      status: AnalysisJobStatus.PREPROCESSING,
      leaseOwner: 'worker-1',
      leaseExpiresAt: new Date('2026-06-17T23:59:00.000Z'),
    }));

    await expect(workerService.markStt('job-id', {
      segments: [{
        segmentIndex: 0,
        startMs: 0,
        endMs: 2500,
        transcriptText: 'Fresh transcript.',
      }],
    })).resolves.toMatchObject({
      status: AnalysisJobStatus.STT_PROCESSING,
      leaseOwner: 'worker-1',
      leaseExpiresAt: new Date('2026-06-18T00:15:00.000Z'),
    });
  });

  it('refreshes a stale lease when segmenting starts', async () => {
    jobsRepository.findOne.mockResolvedValue(buildJob({
      status: AnalysisJobStatus.REDACTION_PENDING,
      leaseOwner: 'worker-1',
      leaseExpiresAt: new Date('2026-06-17T23:59:00.000Z'),
    }));

    await expect(workerService.markSegmenting('job-id', {
      segments: [{
        segmentIndex: 0,
        sourceTranscriptSegmentIds: ['11111111-1111-4111-8111-111111111111'],
        startMs: 0,
        endMs: 2500,
        memoryText: 'Fresh memory.',
      }],
    })).resolves.toMatchObject({
      status: AnalysisJobStatus.SEGMENTING,
      leaseOwner: 'worker-1',
      leaseExpiresAt: new Date('2026-06-18T00:15:00.000Z'),
    });
  });

  it('clears active lease fields when a worker marks a terminal state', async () => {
    jobsRepository.findOne
      .mockResolvedValueOnce(buildJob({
        status: AnalysisJobStatus.INDEXING,
        leaseOwner: 'worker-1',
        leaseExpiresAt: new Date('2026-06-17T23:59:00.000Z'),
      }))
      .mockResolvedValueOnce(buildJob({
        status: AnalysisJobStatus.SEGMENTING,
        retryCount: 3,
        maxRetries: 3,
        leaseOwner: 'worker-1',
        leaseExpiresAt: new Date('2026-06-17T23:59:00.000Z'),
      }));

    await expect(workerService.markCompleted('job-id')).resolves.toMatchObject({
      status: AnalysisJobStatus.COMPLETED,
      leaseOwner: null,
      leaseExpiresAt: null,
    });
    await expect(workerService.markFailed('job-id', {
      failureCode: 'synthetic_failure',
    })).resolves.toMatchObject({
      status: AnalysisJobStatus.FAILED_TERMINAL,
      leaseOwner: null,
      leaseExpiresAt: null,
    });
  });
});

function buildJob(overrides: Partial<AnalysisJob> = {}): AnalysisJob {
  return Object.assign(new AnalysisJob(), {
    id: 'job-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    recordingId: 'recording-id',
    orderId: 'order-id',
    entitlementId: 'entitlement-id',
    status: AnalysisJobStatus.LEASED,
    failureCode: null,
    failureMessage: null,
    retryCount: 0,
    maxRetries: 3,
    leaseOwner: null,
    leaseExpiresAt: null,
    timeoutAt: null,
    statusChangedAt: new Date('2026-06-18T00:00:00.000Z'),
    completedAt: null,
    failedAt: null,
    cancelledAt: null,
    ...overrides,
  });
}

function buildRecording(): Recording {
  return Object.assign(new Recording(), {
    id: 'recording-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    archiveStatus: RecordingArchiveStatus.ARCHIVED,
    uploadStatus: RecordingUploadStatus.UPLOADED,
    analysisStatus: RecordingAnalysisStatus.FULL_ANALYSIS_QUEUED,
    analysisStage: AnalysisJobStatus.LEASED,
    memoriesStatus: 'locked_until_memories',
  });
}
