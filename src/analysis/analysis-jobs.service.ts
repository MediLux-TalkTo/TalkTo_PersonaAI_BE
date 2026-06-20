import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, LessThanOrEqual, Repository } from 'typeorm';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../common/enums/archive.enums';
import { ConsentFeature } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { OrderPaymentStatus } from '../orders/order.constants';
import { Order } from '../orders/order.entity';
import { Entitlement } from '../payments/entitlement.entity';
import { EntitlementStatus } from '../payments/payment-event.constants';
import { ProductFeature } from '../products/product.constants';
import { Recording, RecordingArchiveStatus } from '../recordings/recording.entity';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisJob } from './analysis-job.entity';
import {
  ACTIVE_ANALYSIS_JOB_STATUSES,
  assertAnalysisJobTransition,
  isAnalysisJobActive,
  LEASED_ANALYSIS_JOB_STATUSES,
  timedOutStatusForJob,
} from './analysis-job-transitions';

const DEFAULT_MAX_RETRIES = 3;

export type CreatePaidAnalysisJobInput = {
  readonly ownerUserId: string;
  readonly recordingId: string;
  readonly orderId: string;
  readonly entitlementId: string;
};

@Injectable()
export class AnalysisJobsService {
  constructor(
    @InjectRepository(AnalysisJob)
    private readonly analysisJobsRepository: Repository<AnalysisJob>,
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @InjectRepository(Entitlement)
    private readonly entitlementsRepository: Repository<Entitlement>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly consentsService: ConsentsService,
    private readonly appEventsService: AppEventsService,
  ) {}

  async createQueuedForPaidRecording(
    input: CreatePaidAnalysisJobInput,
    manager?: EntityManager,
  ): Promise<AnalysisJob> {
    const repositories = this.repositories(manager);
    const recording = await repositories.recordings.findOne({
      where: { id: input.recordingId, ownerUserId: input.ownerUserId },
    });
    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }
    this.assertRecordingCanBeAnalyzed(recording);

    const entitlement = await repositories.entitlements.findOne({
      where: {
        id: input.entitlementId,
        ownerUserId: input.ownerUserId,
        orderId: input.orderId,
        status: EntitlementStatus.ACTIVE,
        feature: ProductFeature.MEMORIES,
      },
    });
    if (!entitlement || this.isEntitlementExpired(entitlement)) {
      throw new ForbiddenException({
        code: 'requires_active_entitlement',
        message: 'Active Memories entitlement is required for analysis.',
      });
    }

    const order = await repositories.orders.findOne({
      where: {
        id: input.orderId,
        ownerUserId: input.ownerUserId,
        paymentStatus: OrderPaymentStatus.PAID,
        targetRecordingId: input.recordingId,
      },
    });
    if (!order) {
      throw new ForbiddenException({
        code: 'requires_paid_trigger',
        message: 'Verified paid Memories order is required for analysis.',
      });
    }

    await this.consentsService.assertRequiredConsents(
      input.ownerUserId,
      ConsentFeature.MEMORIES,
      recording.subjectId,
    );

    const existingJob = await repositories.jobs.findOne({
      where: {
        ownerUserId: input.ownerUserId,
        recordingId: input.recordingId,
        status: In([...ACTIVE_ANALYSIS_JOB_STATUSES]),
      },
      order: { createdAt: 'DESC' },
    });
    if (existingJob) {
      return existingJob;
    }

    const now = new Date();
    const job = await repositories.jobs.save(
      repositories.jobs.create({
        ownerUserId: input.ownerUserId,
        subjectId: recording.subjectId,
        recordingId: input.recordingId,
        orderId: input.orderId,
        entitlementId: input.entitlementId,
        status: AnalysisJobStatus.QUEUED,
        failureCode: null,
        failureMessage: null,
        retryCount: 0,
        maxRetries: DEFAULT_MAX_RETRIES,
        leaseOwner: null,
        leaseExpiresAt: null,
        timeoutAt: null,
        statusChangedAt: now,
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
      }),
    );

    recording.analysisStatus = RecordingAnalysisStatus.FULL_ANALYSIS_QUEUED;
    recording.analysisStage = AnalysisJobStatus.QUEUED;
    await repositories.recordings.save(recording);
    await this.appEventsService.emit({
      userId: input.ownerUserId,
      name: 'analysis.job_queued',
      subjectId: recording.subjectId,
      recordingId: recording.id,
      orderId: input.orderId,
      payload: {
        jobId: job.id,
        status: job.status,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
      },
    });

    return job;
  }

  async retryJob(jobId: string, ownerUserId: string): Promise<AnalysisJob> {
    const job = await this.analysisJobsRepository.findOne({
      where: { id: jobId, ownerUserId },
    });
    if (!job) {
      throw new NotFoundException('Analysis job not found.');
    }
    if (job.status !== AnalysisJobStatus.FAILED_RETRYABLE) {
      throw new ConflictException({
        code: 'analysis_job_retry_not_allowed',
        message: 'Only retryable analysis job failures can be retried.',
        status: job.status,
      });
    }
    if (job.retryCount >= job.maxRetries) {
      throw new ConflictException({
        code: 'analysis_job_retry_budget_exhausted',
        message: 'Analysis job retry budget is exhausted.',
      });
    }

    this.transitionJob(job, AnalysisJobStatus.QUEUED);
    job.retryCount += 1;
    job.failureCode = null;
    job.failureMessage = null;
    job.failedAt = null;
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    job.timeoutAt = null;

    const savedJob = await this.analysisJobsRepository.save(job);
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'analysis.job_retried',
      subjectId: savedJob.subjectId,
      recordingId: savedJob.recordingId,
      orderId: savedJob.orderId,
      payload: {
        jobId: savedJob.id,
        status: savedJob.status,
        retryCount: savedJob.retryCount,
        maxRetries: savedJob.maxRetries,
      },
    });

    return savedJob;
  }

  async markExpiredLeases(now = new Date()): Promise<AnalysisJob[]> {
    const jobs = await this.analysisJobsRepository.find({
      where: {
        status: In([...LEASED_ANALYSIS_JOB_STATUSES]),
        leaseExpiresAt: LessThanOrEqual(now),
      },
    });

    const savedJobs: AnalysisJob[] = [];
    for (const job of jobs) {
      const nextStatus = timedOutStatusForJob(job);
      this.transitionJob(job, nextStatus);
      job.failureCode = 'lease_timeout';
      job.failureMessage = 'Analysis job lease expired before worker completion.';
      job.failedAt = now;
      job.leaseOwner = null;
      job.leaseExpiresAt = null;
      savedJobs.push(await this.analysisJobsRepository.save(job));
    }

    return savedJobs;
  }

  async blockActiveJobsForConsentWithdrawal(input: {
    readonly ownerUserId: string;
    readonly subjectId?: string;
  }): Promise<AnalysisJob[]> {
    const jobs = await this.analysisJobsRepository.find({
      where: {
        ownerUserId: input.ownerUserId,
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
        status: In([...ACTIVE_ANALYSIS_JOB_STATUSES]),
      },
    });

    const blockedJobs: AnalysisJob[] = [];
    for (const job of jobs) {
      this.transitionJob(job, AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN);
      job.failureCode = 'consent_withdrawn';
      job.failureMessage = 'AI analysis consent was withdrawn before completion.';
      job.failedAt = new Date();
      job.leaseOwner = null;
      job.leaseExpiresAt = null;
      blockedJobs.push(await this.analysisJobsRepository.save(job));
    }

    return blockedJobs;
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

  private repositories(manager?: EntityManager) {
    return {
      jobs: manager?.getRepository(AnalysisJob) ?? this.analysisJobsRepository,
      recordings: manager?.getRepository(Recording) ?? this.recordingsRepository,
      entitlements:
        manager?.getRepository(Entitlement) ?? this.entitlementsRepository,
      orders: manager?.getRepository(Order) ?? this.ordersRepository,
    };
  }

  private assertRecordingCanBeAnalyzed(recording: Recording): void {
    if (
      recording.archiveStatus !== RecordingArchiveStatus.ARCHIVED ||
      recording.uploadStatus !== RecordingUploadStatus.UPLOADED
    ) {
      throw new BadRequestException({
        code: 'recording_not_archived',
        message: 'Only archived recordings can be analyzed.',
      });
    }
  }

  private isEntitlementExpired(entitlement: Entitlement): boolean {
    return Boolean(entitlement.endsAt && entitlement.endsAt.getTime() <= Date.now());
  }

  private transitionJob(job: AnalysisJob, status: AnalysisJobStatus): void {
    assertAnalysisJobTransition(job.status, status);
    job.status = status;
    job.statusChangedAt = new Date();

    if (!isAnalysisJobActive(status)) {
      job.leaseOwner = null;
      job.leaseExpiresAt = null;
    }
  }
}
