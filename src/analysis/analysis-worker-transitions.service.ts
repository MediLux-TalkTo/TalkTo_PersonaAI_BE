import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordingAnalysisStatus } from '../common/enums/archive.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { Recording } from '../recordings/recording.entity';
import { AnalysisEmbedding } from './analysis-embedding.entity';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisJob } from './analysis-job.entity';
import { assertAnalysisJobTransition } from './analysis-job-transitions';
import {
  MarkFailedDto,
  MarkIndexingDto,
  MarkSegmentingDto,
  MarkSttDto,
  WorkerTransitionDto,
} from './dto/worker-transition.dto';
import { MemorySegment } from './memory-segment.entity';
import { TranscriptSegment } from './transcript-segment.entity';

const UNKNOWN_SPEAKER_LABEL = 'unknown';
const WORKER_LEASE_MS = 15 * 60 * 1000;

@Injectable()
export class AnalysisWorkerTransitionsService {
  constructor(
    @InjectRepository(AnalysisJob)
    private readonly jobsRepository: Repository<AnalysisJob>,
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @InjectRepository(TranscriptSegment)
    private readonly transcriptSegmentsRepository: Repository<TranscriptSegment>,
    @InjectRepository(MemorySegment)
    private readonly memorySegmentsRepository: Repository<MemorySegment>,
    @InjectRepository(AnalysisEmbedding)
    private readonly embeddingsRepository: Repository<AnalysisEmbedding>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async markPreprocessing(
    jobId: string,
    dto: WorkerTransitionDto,
  ): Promise<AnalysisJob> {
    const { job, recording } = await this.loadJobWithRecording(jobId);
    const path =
      job.status === AnalysisJobStatus.QUEUED
        ? [AnalysisJobStatus.LEASED, AnalysisJobStatus.PREPROCESSING]
        : [AnalysisJobStatus.PREPROCESSING];
    this.transitionThrough(job, path);
    this.refreshLease(job, dto.workerId);
    return this.saveJobAndProgress(job, recording);
  }

  async markStt(jobId: string, dto: MarkSttDto): Promise<AnalysisJob> {
    this.assertValidTimedSegments(dto.segments);
    const { job, recording } = await this.loadJobWithRecording(jobId);
    if (job.status !== AnalysisJobStatus.STT_PROCESSING) {
      this.transitionThrough(job, [
        AnalysisJobStatus.PREPROCESSING,
        AnalysisJobStatus.STT_PROCESSING,
      ]);
    }
    this.refreshLease(job);
    job.subjectSpeakerLabel = dto.subjectSpeakerLabel ?? job.subjectSpeakerLabel ?? null;
    await this.transcriptSegmentsRepository.upsert(
      dto.segments.map((segment) => ({
        jobId: job.id,
        ownerUserId: job.ownerUserId,
        subjectId: job.subjectId,
        recordingId: job.recordingId,
        segmentIndex: segment.segmentIndex,
        startMs: segment.startMs,
        endMs: segment.endMs,
        speakerLabel: segment.speakerLabel ?? UNKNOWN_SPEAKER_LABEL,
        transcriptText: segment.transcriptText,
        correctedText: segment.correctedText ?? null,
        needsReview: segment.needsReview ?? false,
        confidence: segment.confidence ?? null,
      })),
      {
        conflictPaths: ['jobId', 'segmentIndex'],
        skipUpdateIfNoValuesChanged: true,
      },
    );
    const savedJob = await this.saveJobAndProgress(job, recording);
    return savedJob;
  }

  async markRedaction(jobId: string): Promise<AnalysisJob> {
    const { job, recording } = await this.loadJobWithRecording(jobId);
    this.transitionThrough(job, [AnalysisJobStatus.REDACTION_PENDING]);
    this.refreshLease(job);
    return this.saveJobAndProgress(job, recording);
  }

  async markSegmenting(
    jobId: string,
    dto: MarkSegmentingDto,
  ): Promise<AnalysisJob> {
    this.assertValidTimedSegments(dto.segments);
    const { job, recording } = await this.loadJobWithRecording(jobId);
    this.transitionThrough(job, [AnalysisJobStatus.SEGMENTING]);
    this.refreshLease(job);
    if (dto.segments.length > 0) {
      await this.memorySegmentsRepository.upsert(
        dto.segments.map((segment) => ({
          jobId: job.id,
          ownerUserId: job.ownerUserId,
          subjectId: job.subjectId,
          recordingId: job.recordingId,
          segmentIndex: segment.segmentIndex,
          sourceTranscriptSegmentIds: segment.sourceTranscriptSegmentIds,
          startMs: segment.startMs,
          endMs: segment.endMs,
          speakerLabel: segment.speakerLabel ?? UNKNOWN_SPEAKER_LABEL,
          memoryText: segment.memoryText,
          confidence: segment.confidence ?? 'confirmed',
          importanceScore: segment.importanceScore ?? null,
          tags: segment.tags ?? [],
          relatedPeople: segment.relatedPeople ?? [],
          sensitivityFlags: segment.sensitivityFlags ?? [],
        })),
        {
          conflictPaths: ['jobId', 'segmentIndex'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    }
    return this.saveJobAndProgress(job, recording);
  }

  async markIndexing(jobId: string, dto: MarkIndexingDto): Promise<AnalysisJob> {
    this.assertValidEmbeddings(dto);
    const { job, recording } = await this.loadJobWithRecording(jobId);
    this.transitionThrough(job, [AnalysisJobStatus.INDEXING]);
    this.refreshLease(job);
    if (dto.embeddings.length > 0) {
      await this.embeddingsRepository.upsert(
        dto.embeddings.map((embedding) => ({
          jobId: job.id,
          ownerUserId: job.ownerUserId,
          subjectId: job.subjectId,
          recordingId: job.recordingId,
          memorySegmentId: embedding.memorySegmentId,
          embeddingIndex: embedding.embeddingIndex,
          provider: embedding.provider,
          model: embedding.model,
          dimensions: embedding.dimensions,
          embedding: embedding.embedding,
        })),
        {
          conflictPaths: ['jobId', 'embeddingIndex'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    }
    return this.saveJobAndProgress(job, recording);
  }

  async markCompleted(jobId: string): Promise<AnalysisJob> {
    const { job, recording } = await this.loadJobWithRecording(jobId);
    this.transitionThrough(job, [
      AnalysisJobStatus.INDEXING,
      AnalysisJobStatus.COMPLETED,
    ]);
    job.completedAt = new Date();
    job.failedAt = null;
    job.failureCode = null;
    job.failureMessage = null;
    this.clearLease(job);
    const savedJob = await this.saveJobAndProgress(job, recording);
    await this.notificationsService.notifyAnalysisCompleted(savedJob);
    return savedJob;
  }

  async markFailed(jobId: string, dto: MarkFailedDto): Promise<AnalysisJob> {
    const { job, recording } = await this.loadJobWithRecording(jobId);
    const failedStatus =
      job.retryCount < job.maxRetries
        ? AnalysisJobStatus.FAILED_RETRYABLE
        : AnalysisJobStatus.FAILED_TERMINAL;
    this.transitionThrough(job, [failedStatus]);
    job.failedAt = new Date();
    job.failureCode = dto.failureCode;
    job.failureMessage = dto.failureMessage ?? null;
    this.clearLease(job);
    const savedJob = await this.saveJobAndProgress(job, recording);
    await this.notificationsService.notifyAnalysisFailed(savedJob);
    return savedJob;
  }

  toDto(job: AnalysisJob) {
    return {
      id: job.id,
      recordingId: job.recordingId,
      subjectId: job.subjectId,
      orderId: job.orderId,
      entitlementId: job.entitlementId,
      status: job.status,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      failureCode: job.failureCode,
      failureMessage: job.failureMessage,
    };
  }

  private async loadJobWithRecording(jobId: string) {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Analysis job not found.');
    }
    const recording = await this.recordingsRepository.findOne({
      where: { id: job.recordingId },
    });
    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }
    return { job, recording };
  }

  private transitionThrough(
    job: AnalysisJob,
    targets: readonly AnalysisJobStatus[],
  ): void {
    for (const target of targets) {
      if (job.status === target) {
        continue;
      }
      assertAnalysisJobTransition(job.status, target);
      job.status = target;
      job.statusChangedAt = new Date();
    }
  }

  private refreshLease(job: AnalysisJob, workerId?: string): void {
    job.leaseOwner = workerId ?? job.leaseOwner;
    job.leaseExpiresAt = new Date(Date.now() + WORKER_LEASE_MS);
  }

  private clearLease(job: AnalysisJob): void {
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
  }

  private async saveJobAndProgress(
    job: AnalysisJob,
    recording: Recording,
  ): Promise<AnalysisJob> {
    const savedJob = await this.jobsRepository.save(job);
    await this.saveRecordingProgress(recording, savedJob.status);
    return savedJob;
  }

  private async saveRecordingProgress(
    recording: Recording,
    status: AnalysisJobStatus,
  ): Promise<void> {
    recording.analysisStage = status;
    recording.analysisStatus = this.analysisStatusForJob(status);
    if (status === AnalysisJobStatus.COMPLETED) {
      recording.memoriesStatus = 'ready';
    }
    await this.recordingsRepository.save(recording);
  }

  private analysisStatusForJob(status: AnalysisJobStatus): RecordingAnalysisStatus {
    if (status === AnalysisJobStatus.COMPLETED) {
      return RecordingAnalysisStatus.FULLY_INDEXED;
    }
    if (
      status === AnalysisJobStatus.FAILED_RETRYABLE ||
      status === AnalysisJobStatus.FAILED_TERMINAL
    ) {
      return RecordingAnalysisStatus.FULL_ANALYSIS_FAILED;
    }
    return RecordingAnalysisStatus.FULL_ANALYSIS_PROCESSING;
  }

  private assertValidTimedSegments(
    segments: readonly { readonly startMs: number; readonly endMs: number }[],
  ): void {
    for (const segment of segments) {
      if (segment.endMs < segment.startMs) {
        throw new BadRequestException({
          code: 'invalid_segment_timing',
          message: 'Segment endMs must be greater than or equal to startMs.',
        });
      }
    }
  }

  private assertValidEmbeddings(dto: MarkIndexingDto): void {
    for (const embedding of dto.embeddings) {
      if (embedding.embedding.length !== embedding.dimensions) {
        throw new BadRequestException({
          code: 'embedding_dimension_mismatch',
          message: 'Embedding vector length must match dimensions.',
        });
      }
    }
  }
}
