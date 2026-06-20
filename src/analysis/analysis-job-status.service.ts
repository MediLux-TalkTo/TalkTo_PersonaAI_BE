import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/enums/role.enum';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisJob } from './analysis-job.entity';
import { AnalysisJobsService } from './analysis-jobs.service';
import {
  AnalysisJobProgressDto,
  AnalysisJobStatusDto,
} from './dto/analysis-job-status-response.dto';
import { QueryAnalysisJobsDto } from './dto/query-analysis-jobs.dto';

const DEFAULT_LIST_LIMIT = 50;

type AdminAnalysisActor = {
  readonly userId: string;
  readonly role: Role;
};

@Injectable()
export class AnalysisJobStatusService {
  constructor(
    @InjectRepository(AnalysisJob)
    private readonly analysisJobsRepository: Repository<AnalysisJob>,
    private readonly analysisJobsService: AnalysisJobsService,
    private readonly auditService: AuditService,
  ) {}

  async listForOwner(
    ownerUserId: string,
    query: QueryAnalysisJobsDto,
  ): Promise<AnalysisJobStatusDto[]> {
    return this.listJobs({ ...query, ownerUserId });
  }

  async listForAdmin(query: QueryAnalysisJobsDto): Promise<AnalysisJobStatusDto[]> {
    return this.listJobs(query);
  }

  async adminRetryJob(
    jobId: string,
    actor: AdminAnalysisActor,
  ): Promise<AnalysisJobStatusDto> {
    const previousJob = await this.analysisJobsRepository.findOne({
      where: { id: jobId },
    });
    if (!previousJob) {
      throw new NotFoundException('Analysis job not found.');
    }

    const retriedJob = await this.analysisJobsService.retryJob(
      previousJob.id,
      previousJob.ownerUserId,
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: 'analysis_job_retry',
      resourceType: 'analysis_job',
      resourceId: retriedJob.id,
      subjectId: retriedJob.subjectId,
      metadata: {
        ownerUserId: retriedJob.ownerUserId,
        recordingId: retriedJob.recordingId,
        previousStatus: previousJob.status,
        previousFailureCode: previousJob.failureCode,
        retryCount: retriedJob.retryCount,
        maxRetries: retriedJob.maxRetries,
      },
    });

    return this.toStatusDto(retriedJob);
  }

  toStatusDto(job: AnalysisJob): AnalysisJobStatusDto {
    return {
      id: job.id,
      ownerUserId: job.ownerUserId,
      recordingId: job.recordingId,
      subjectId: job.subjectId,
      orderId: job.orderId,
      entitlementId: job.entitlementId,
      status: job.status,
      progress: progressForStatus(job.status),
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      failureCode: job.failureCode,
      failureMessage: job.failureMessage,
      statusChangedAt: job.statusChangedAt.toISOString(),
      completedAt: optionalIso(job.completedAt),
      failedAt: optionalIso(job.failedAt),
      cancelledAt: optionalIso(job.cancelledAt),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  private async listJobs(
    query: QueryAnalysisJobsDto & { readonly ownerUserId?: string },
  ): Promise<AnalysisJobStatusDto[]> {
    const where: FindOptionsWhere<AnalysisJob> = {};
    if (query.ownerUserId) {
      where.ownerUserId = query.ownerUserId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.recordingId) {
      where.recordingId = query.recordingId;
    }
    if (query.subjectId) {
      where.subjectId = query.subjectId;
    }

    const jobs = await this.analysisJobsRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit ?? DEFAULT_LIST_LIMIT,
    });

    return jobs.map((job) => this.toStatusDto(job));
  }
}

function optionalIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function progressForStatus(status: AnalysisJobStatus): AnalysisJobProgressDto {
  switch (status) {
    case AnalysisJobStatus.QUEUED:
      return { stage: status, percent: 0, terminal: false };
    case AnalysisJobStatus.LEASED:
      return { stage: status, percent: 5, terminal: false };
    case AnalysisJobStatus.PREPROCESSING:
      return { stage: status, percent: 15, terminal: false };
    case AnalysisJobStatus.STT_PROCESSING:
      return { stage: status, percent: 35, terminal: false };
    case AnalysisJobStatus.REDACTION_PENDING:
      return { stage: status, percent: 55, terminal: false };
    case AnalysisJobStatus.SEGMENTING:
      return { stage: status, percent: 70, terminal: false };
    case AnalysisJobStatus.EMBEDDING:
      return { stage: status, percent: 85, terminal: false };
    case AnalysisJobStatus.INDEXING:
      return { stage: status, percent: 95, terminal: false };
    case AnalysisJobStatus.COMPLETED:
      return { stage: status, percent: 100, terminal: true };
    case AnalysisJobStatus.FAILED_RETRYABLE:
      return { stage: status, percent: 90, terminal: false };
    case AnalysisJobStatus.FAILED_TERMINAL:
    case AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN:
    case AnalysisJobStatus.CANCELLED:
      return { stage: status, percent: 100, terminal: true };
    default:
      return assertNever(status);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled analysis job status: ${value}`);
}
