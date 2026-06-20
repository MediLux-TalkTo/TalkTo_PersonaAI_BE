import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/enums/role.enum';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisJob } from './analysis-job.entity';
import { AnalysisJobStatusService } from './analysis-job-status.service';
import { AnalysisJobsService } from './analysis-jobs.service';

describe('AnalysisJobStatusService', () => {
  const jobsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const analysisJobsService = {
    retryJob: jest.fn(),
  };
  const auditService = {
    record: jest.fn(),
  };
  let service: AnalysisJobStatusService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jobsRepository.find.mockResolvedValue([buildJob({ id: 'job-id' })]);
    jobsRepository.findOne.mockResolvedValue(buildJob({ id: 'job-id' }));
    analysisJobsService.retryJob.mockResolvedValue(
      buildJob({
        id: 'job-id',
        status: AnalysisJobStatus.QUEUED,
        retryCount: 2,
        failureCode: null,
        failureMessage: null,
      }),
    );
    auditService.record.mockResolvedValue({ id: 'audit-id' });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalysisJobStatusService,
        { provide: getRepositoryToken(AnalysisJob), useValue: jobsRepository },
        { provide: AnalysisJobsService, useValue: analysisJobsService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = moduleRef.get(AnalysisJobStatusService);
  });

  it('lists owner-scoped jobs and maps failure code plus progress fields', async () => {
    await expect(
      service.listForOwner('owner-id', {
        status: AnalysisJobStatus.FAILED_RETRYABLE,
        limit: 25,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'job-id',
        ownerUserId: 'owner-id',
        failureCode: 'worker_timeout',
        progress: {
          stage: AnalysisJobStatus.FAILED_RETRYABLE,
          percent: 90,
          terminal: false,
        },
      }),
    ]);

    expect(jobsRepository.find).toHaveBeenCalledWith({
      where: {
        ownerUserId: 'owner-id',
        status: AnalysisJobStatus.FAILED_RETRYABLE,
      },
      order: { createdAt: 'DESC' },
      take: 25,
    });
  });

  it('lists all jobs for admin and ops without owner narrowing', async () => {
    await service.listForAdmin({ status: AnalysisJobStatus.QUEUED });

    expect(jobsRepository.find).toHaveBeenCalledWith({
      where: { status: AnalysisJobStatus.QUEUED },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  });

  it('requeues the existing retryable job and records an admin audit event without creating duplicates', async () => {
    await expect(
      service.adminRetryJob('job-id', {
        userId: 'admin-id',
        role: Role.ADMIN,
      }),
    ).resolves.toMatchObject({
      id: 'job-id',
      status: AnalysisJobStatus.QUEUED,
      retryCount: 2,
      failureCode: null,
    });

    expect(jobsRepository.findOne).toHaveBeenCalledWith({ where: { id: 'job-id' } });
    expect(analysisJobsService.retryJob).toHaveBeenCalledWith('job-id', 'owner-id');
    expect(auditService.record).toHaveBeenCalledWith({
      actorUserId: 'admin-id',
      actorRole: Role.ADMIN,
      action: 'analysis_job_retry',
      resourceType: 'analysis_job',
      resourceId: 'job-id',
      subjectId: 'subject-id',
      metadata: {
        ownerUserId: 'owner-id',
        recordingId: 'recording-id',
        previousStatus: AnalysisJobStatus.FAILED_RETRYABLE,
        previousFailureCode: 'worker_timeout',
        retryCount: 2,
        maxRetries: 3,
      },
    });
    expect(jobsRepository).not.toHaveProperty('save');
  });

  it('returns not found for stale T11 job ids before retrying or auditing', async () => {
    jobsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.adminRetryJob('missing-job-id', {
        userId: 'admin-id',
        role: Role.ADMIN,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(analysisJobsService.retryJob).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });
});

function buildJob(overrides: Partial<AnalysisJob>): AnalysisJob {
  return {
    id: 'job-id',
    ownerUserId: 'owner-id',
    recordingId: 'recording-id',
    subjectId: 'subject-id',
    orderId: 'order-id',
    entitlementId: 'entitlement-id',
    status: AnalysisJobStatus.FAILED_RETRYABLE,
    failureCode: 'worker_timeout',
    failureMessage: 'Worker timed out.',
    retryCount: 1,
    maxRetries: 3,
    leaseOwner: null,
    leaseExpiresAt: null,
    timeoutAt: null,
    statusChangedAt: new Date('2026-06-18T00:00:00.000Z'),
    completedAt: null,
    failedAt: new Date('2026-06-18T00:01:00.000Z'),
    cancelledAt: null,
    createdAt: new Date('2026-06-18T00:00:00.000Z'),
    updatedAt: new Date('2026-06-18T00:01:00.000Z'),
    ...overrides,
  } as AnalysisJob;
}
