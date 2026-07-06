import { BadRequestException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../common/enums/archive.enums';
import { Recording, RecordingArchiveStatus } from '../recordings/recording.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AnalysisEmbedding } from './analysis-embedding.entity';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisJob } from './analysis-job.entity';
import { AnalysisWorkerTransitionsService } from './analysis-worker-transitions.service';
import { MemorySegment } from './memory-segment.entity';
import { TranscriptSegment } from './transcript-segment.entity';

describe('AnalysisWorkerTransitionsService', () => {
  const jobsRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value: AnalysisJob) => value),
  };
  const recordingsRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value: Recording) => value),
  };
  const transcriptSegmentsRepository = {
    upsert: jest.fn(async (value: readonly TranscriptSegment[]) => value),
  };
  const memorySegmentsRepository = {
    upsert: jest.fn(async (value: readonly MemorySegment[]) => value),
  };
  const embeddingsRepository = {
    upsert: jest.fn(async (value: readonly AnalysisEmbedding[]) => value),
  };
  const notificationsService = {
    notifyAnalysisCompleted: jest.fn(),
    notifyAnalysisFailed: jest.fn(),
  };
  let service: AnalysisWorkerTransitionsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jobsRepository.findOne.mockResolvedValue(buildJob());
    jobsRepository.save.mockImplementation(async (value: AnalysisJob) => value);
    recordingsRepository.findOne.mockResolvedValue(buildRecording());
    recordingsRepository.save.mockImplementation(async (value: Recording) => value);
    notificationsService.notifyAnalysisCompleted.mockResolvedValue(null);
    notificationsService.notifyAnalysisFailed.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalysisWorkerTransitionsService,
        { provide: getRepositoryToken(AnalysisJob), useValue: jobsRepository },
        { provide: getRepositoryToken(Recording), useValue: recordingsRepository },
        {
          provide: getRepositoryToken(TranscriptSegment),
          useValue: transcriptSegmentsRepository,
        },
        { provide: getRepositoryToken(MemorySegment), useValue: memorySegmentsRepository },
        { provide: getRepositoryToken(AnalysisEmbedding), useValue: embeddingsRepository },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get(AnalysisWorkerTransitionsService);
  });

  it('creates transcript segments with unknown speakers when STT is marked', async () => {
    await service.markPreprocessing('job-id', { workerId: 'worker-1' });

    await expect(
      service.markStt('job-id', {
        segments: [
          {
            segmentIndex: 0,
            startMs: 0,
            endMs: 2500,
            transcriptText: 'Synthetic redacted hello.',
            confidence: 0.91,
          },
        ],
      }),
    ).resolves.toMatchObject({ status: AnalysisJobStatus.STT_PROCESSING });

    expect(transcriptSegmentsRepository.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        jobId: 'job-id',
        recordingId: 'recording-id',
        subjectId: 'subject-id',
        ownerUserId: 'user-id',
        segmentIndex: 0,
        speakerLabel: 'unknown',
        transcriptText: 'Synthetic redacted hello.',
        confidence: 0.91,
      }),
    ], expect.objectContaining({ conflictPaths: ['jobId', 'segmentIndex'] }));
    expect(recordingsRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        analysisStatus: RecordingAnalysisStatus.FULL_ANALYSIS_PROCESSING,
        analysisStage: AnalysisJobStatus.STT_PROCESSING,
      }),
    );
  });

  it('creates memory segments and embeddings without requiring diarization', async () => {
    jobsRepository.findOne
      .mockResolvedValueOnce(buildJob({ status: AnalysisJobStatus.STT_PROCESSING }))
      .mockResolvedValueOnce(buildJob({ status: AnalysisJobStatus.REDACTION_PENDING }))
      .mockResolvedValueOnce(buildJob({ status: AnalysisJobStatus.SEGMENTING }));

    await expect(service.markRedaction('job-id')).resolves.toMatchObject({
      status: AnalysisJobStatus.REDACTION_PENDING,
    });
    await expect(
      service.markSegmenting('job-id', {
        segments: [
          {
            segmentIndex: 0,
            sourceTranscriptSegmentIds: ['transcript-segment-id'],
            startMs: 0,
            endMs: 2500,
            memoryText: 'Synthetic memory text.',
          },
        ],
      }),
    ).resolves.toMatchObject({ status: AnalysisJobStatus.SEGMENTING });
    await expect(
      service.markIndexing('job-id', {
        embeddings: [
          {
            memorySegmentId: 'memory-segment-id',
            embeddingIndex: 0,
            provider: 'synthetic',
            model: 'unit-test',
            dimensions: 3,
            embedding: [0.1, 0.2, 0.3],
          },
        ],
      }),
    ).resolves.toMatchObject({ status: AnalysisJobStatus.INDEXING });

    expect(memorySegmentsRepository.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        speakerLabel: 'unknown',
        memoryText: 'Synthetic memory text.',
        sourceTranscriptSegmentIds: ['transcript-segment-id'],
      }),
    ], expect.objectContaining({ conflictPaths: ['jobId', 'segmentIndex'] }));
    expect(embeddingsRepository.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        memorySegmentId: 'memory-segment-id',
        embeddingIndex: 0,
        dimensions: 3,
        embedding: [0.1, 0.2, 0.3],
      }),
    ], expect.objectContaining({ conflictPaths: ['jobId', 'embeddingIndex'] }));
  });

  it('marks completed and failed terminal states with recording progress', async () => {
    jobsRepository.findOne.mockResolvedValueOnce(buildJob({
      status: AnalysisJobStatus.INDEXING,
    }));

    await expect(service.markCompleted('job-id')).resolves.toMatchObject({
      status: AnalysisJobStatus.COMPLETED,
      completedAt: expect.any(Date),
    });
    expect(notificationsService.notifyAnalysisCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-id',
        status: AnalysisJobStatus.COMPLETED,
      }),
    );
    expect(recordingsRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        analysisStatus: RecordingAnalysisStatus.FULLY_INDEXED,
        analysisStage: AnalysisJobStatus.COMPLETED,
        memoriesStatus: 'ready',
      }),
    );

    jobsRepository.findOne.mockResolvedValueOnce(buildJob({
      status: AnalysisJobStatus.SEGMENTING,
      retryCount: 3,
      maxRetries: 3,
    }));

    await expect(
      service.markFailed('job-id', {
        failureCode: 'synthetic_failure',
        failureMessage: 'Synthetic worker failure.',
      }),
    ).resolves.toMatchObject({
      status: AnalysisJobStatus.FAILED_TERMINAL,
      failedAt: expect.any(Date),
    });
    expect(notificationsService.notifyAnalysisFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-id',
        status: AnalysisJobStatus.FAILED_TERMINAL,
        failureCode: 'synthetic_failure',
      }),
    );
    expect(recordingsRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        analysisStatus: RecordingAnalysisStatus.FULL_ANALYSIS_FAILED,
        analysisStage: AnalysisJobStatus.FAILED_TERMINAL,
      }),
    );
  });

  it('rejects malformed worker payloads and invalid state rollbacks', async () => {
    await expect(
      service.markStt('job-id', {
        segments: [
          {
            segmentIndex: 0,
            startMs: 5000,
            endMs: 1000,
            transcriptText: 'Invalid timing.',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    jobsRepository.findOne.mockResolvedValueOnce(buildJob({
      status: AnalysisJobStatus.COMPLETED,
    }));

    await expect(service.markPreprocessing('job-id', {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects malformed embedding payloads before writing indexing rows', async () => {
    jobsRepository.findOne.mockResolvedValueOnce(buildJob({
      status: AnalysisJobStatus.SEGMENTING,
    }));

    await expect(
      service.markIndexing('job-id', {
        embeddings: [
          {
            memorySegmentId: 'memory-segment-id',
            embeddingIndex: 0,
            provider: 'synthetic',
            model: 'unit-test',
            dimensions: 4,
            embedding: [0.1, 0.2, 0.3],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(embeddingsRepository.upsert).not.toHaveBeenCalled();
    expect(jobsRepository.save).not.toHaveBeenCalled();
  });
});

function buildJob(overrides: Partial<AnalysisJob> = {}): AnalysisJob {
  const job = new AnalysisJob();
  job.id = 'job-id';
  job.ownerUserId = 'user-id';
  job.subjectId = 'subject-id';
  job.recordingId = 'recording-id';
  job.orderId = 'order-id';
  job.entitlementId = 'entitlement-id';
  job.status = AnalysisJobStatus.LEASED;
  job.failureCode = null;
  job.failureMessage = null;
  job.retryCount = 0;
  job.maxRetries = 3;
  job.leaseOwner = null;
  job.leaseExpiresAt = null;
  job.timeoutAt = null;
  job.statusChangedAt = new Date('2026-06-18T00:00:00.000Z');
  job.completedAt = null;
  job.failedAt = null;
  job.cancelledAt = null;
  return Object.assign(job, overrides);
}

function buildRecording(): Recording {
  const recording = new Recording();
  recording.id = 'recording-id';
  recording.ownerUserId = 'user-id';
  recording.subjectId = 'subject-id';
  recording.archiveStatus = RecordingArchiveStatus.ARCHIVED;
  recording.uploadStatus = RecordingUploadStatus.UPLOADED;
  recording.analysisStatus = RecordingAnalysisStatus.FULL_ANALYSIS_QUEUED;
  recording.analysisStage = AnalysisJobStatus.LEASED;
  recording.memoriesStatus = 'locked_until_memories';
  return recording;
}
