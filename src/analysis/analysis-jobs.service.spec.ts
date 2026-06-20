import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { RecordingAnalysisStatus, RecordingUploadStatus } from '../common/enums/archive.enums';
import { ConsentFeature, ConsentType } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { EntitlementStatus } from '../payments/payment-event.constants';
import { Entitlement } from '../payments/entitlement.entity';
import { ProductFeature } from '../products/product.constants';
import { OrderPaymentStatus } from '../orders/order.constants';
import { Order } from '../orders/order.entity';
import { Recording, RecordingArchiveStatus } from '../recordings/recording.entity';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisJob } from './analysis-job.entity';
import { AnalysisJobsService } from './analysis-jobs.service';

describe('AnalysisJobsService paid creation guard', () => {
  const jobsRepository = {
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ ...value, id: value.id ?? 'analysis-job-id' })),
  };
  const recordingsRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const entitlementsRepository = {
    findOne: jest.fn(),
  };
  const ordersRepository = {
    findOne: jest.fn(),
  };
  const consentsService = {
    assertRequiredConsents: jest.fn(),
  };
  const appEventsService = {
    emit: jest.fn(),
  };
  let service: AnalysisJobsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jobsRepository.create.mockImplementation((value) => value);
    jobsRepository.save.mockImplementation(async (value) => ({
      ...value,
      id: value.id ?? 'analysis-job-id',
    }));
    jobsRepository.findOne.mockResolvedValue(null);
    jobsRepository.find.mockResolvedValue([]);
    recordingsRepository.save.mockImplementation(async (value) => value);
    recordingsRepository.findOne.mockResolvedValue(buildRecording());
    entitlementsRepository.findOne.mockResolvedValue(buildEntitlement());
    ordersRepository.findOne.mockResolvedValue(buildOrder());
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    appEventsService.emit.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalysisJobsService,
        { provide: getRepositoryToken(AnalysisJob), useValue: jobsRepository },
        { provide: getRepositoryToken(Recording), useValue: recordingsRepository },
        { provide: getRepositoryToken(Entitlement), useValue: entitlementsRepository },
        { provide: getRepositoryToken(Order), useValue: ordersRepository },
        { provide: ConsentsService, useValue: consentsService },
        { provide: AppEventsService, useValue: appEventsService },
      ],
    }).compile();

    service = moduleRef.get(AnalysisJobsService);
  });

  it('creates a queued analysis job only for an archived recording with paid entitlement and AI consent', async () => {
    await expect(service.createQueuedForPaidRecording(buildPaidInput())).resolves.toMatchObject({
      id: 'analysis-job-id',
      status: AnalysisJobStatus.QUEUED,
      recordingId: 'recording-id',
      entitlementId: 'entitlement-id',
      orderId: 'order-id',
    });

    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.MEMORIES,
      'subject-id',
    );
    expect(jobsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      status: AnalysisJobStatus.QUEUED,
      retryCount: 0,
      maxRetries: 3,
      leaseOwner: null,
      leaseExpiresAt: null,
    }));
    expect(recordingsRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      analysisStatus: RecordingAnalysisStatus.FULL_ANALYSIS_QUEUED,
      analysisStage: AnalysisJobStatus.QUEUED,
    }));
  });

  it('blocks creation when the paid entitlement is missing', async () => {
    entitlementsRepository.findOne.mockResolvedValue(null);

    await expect(service.createQueuedForPaidRecording(buildPaidInput())).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(jobsRepository.save).not.toHaveBeenCalled();
    expect(recordingsRepository.save).not.toHaveBeenCalled();
  });

  it('blocks creation when AI analysis consent is missing', async () => {
    consentsService.assertRequiredConsents.mockRejectedValue(
      new ForbiddenException({
        code: 'requires_consent',
        missing_consent_types: [ConsentType.AI_ANALYSIS_SERVICE],
      }),
    );

    await expect(service.createQueuedForPaidRecording(buildPaidInput())).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'requires_consent',
      }),
    });

    expect(jobsRepository.save).not.toHaveBeenCalled();
  });

  it('blocks creation when the recording is not archived', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      ...buildRecording(),
      archiveStatus: RecordingArchiveStatus.PENDING_UPLOAD,
      uploadStatus: RecordingUploadStatus.UPLOADING,
    });

    await expect(service.createQueuedForPaidRecording(buildPaidInput())).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(jobsRepository.save).not.toHaveBeenCalled();
  });

  it('returns the existing active job on duplicate paid trigger replay', async () => {
    jobsRepository.findOne.mockResolvedValue({
      id: 'existing-job-id',
      status: AnalysisJobStatus.QUEUED,
      recordingId: 'recording-id',
      ownerUserId: 'user-id',
    });

    await expect(service.createQueuedForPaidRecording(buildPaidInput())).resolves.toMatchObject({
      id: 'existing-job-id',
      status: AnalysisJobStatus.QUEUED,
    });

    expect(jobsRepository.save).not.toHaveBeenCalled();
  });

  it('treats indexing jobs as active duplicate paid trigger replays', async () => {
    jobsRepository.findOne.mockResolvedValue({
      id: 'existing-indexing-job-id',
      status: AnalysisJobStatus.INDEXING,
      recordingId: 'recording-id',
      ownerUserId: 'user-id',
    });

    await expect(service.createQueuedForPaidRecording(buildPaidInput())).resolves.toMatchObject({
      id: 'existing-indexing-job-id',
      status: AnalysisJobStatus.INDEXING,
    });

    expectStatusFilterIncludes(jobsRepository.findOne, AnalysisJobStatus.INDEXING);
    expect(jobsRepository.save).not.toHaveBeenCalled();
  });

  it('retries retryable failures by requeueing the same job and rejects nonretryable states', async () => {
    jobsRepository.findOne.mockResolvedValueOnce({
      id: 'job-id',
      ownerUserId: 'user-id',
      recordingId: 'recording-id',
      subjectId: 'subject-id',
      status: AnalysisJobStatus.FAILED_RETRYABLE,
      retryCount: 1,
      maxRetries: 3,
      failureCode: 'worker_timeout',
      failureMessage: 'worker timed out',
      leaseOwner: 'worker-1',
      leaseExpiresAt: new Date('2026-06-18T00:00:00.000Z'),
    });

    await expect(service.retryJob('job-id', 'user-id')).resolves.toMatchObject({
      status: AnalysisJobStatus.QUEUED,
      retryCount: 2,
      failureCode: null,
      failureMessage: null,
    });

    jobsRepository.findOne.mockResolvedValueOnce({
      id: 'job-id',
      ownerUserId: 'user-id',
      status: AnalysisJobStatus.COMPLETED,
    });

    await expect(service.retryJob('job-id', 'user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('expires indexing leases with the active worker states', async () => {
    const now = new Date('2026-06-18T00:30:00.000Z');
    jobsRepository.find.mockResolvedValue([
      buildAnalysisJob({
        status: AnalysisJobStatus.INDEXING,
        leaseOwner: 'worker-1',
        leaseExpiresAt: new Date('2026-06-18T00:00:00.000Z'),
      }),
    ]);

    await expect(service.markExpiredLeases(now)).resolves.toMatchObject([
      {
        id: 'analysis-job-id',
        status: AnalysisJobStatus.FAILED_RETRYABLE,
        failureCode: 'lease_timeout',
        failedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    ]);

    expectStatusFilterIncludes(jobsRepository.find, AnalysisJobStatus.INDEXING);
  });

  it('blocks indexing jobs when consent is withdrawn', async () => {
    jobsRepository.find.mockResolvedValue([
      buildAnalysisJob({
        status: AnalysisJobStatus.INDEXING,
        leaseOwner: 'worker-1',
        leaseExpiresAt: new Date('2026-06-18T00:30:00.000Z'),
      }),
    ]);

    await expect(
      service.blockActiveJobsForConsentWithdrawal({
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
      }),
    ).resolves.toMatchObject([
      {
        id: 'analysis-job-id',
        status: AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
        failureCode: 'consent_withdrawn',
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    ]);

    expectStatusFilterIncludes(jobsRepository.find, AnalysisJobStatus.INDEXING);
  });
});

function buildPaidInput() {
  return {
    ownerUserId: 'user-id',
    recordingId: 'recording-id',
    orderId: 'order-id',
    entitlementId: 'entitlement-id',
  };
}

function buildRecording(): Recording {
  return {
    id: 'recording-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    archiveStatus: RecordingArchiveStatus.ARCHIVED,
    uploadStatus: RecordingUploadStatus.UPLOADED,
    analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
    analysisStage: 'not_analyzed',
    memoriesStatus: 'locked_until_memories',
  } as Recording;
}

function buildEntitlement(): Entitlement {
  return {
    id: 'entitlement-id',
    ownerUserId: 'user-id',
    orderId: 'order-id',
    productId: 'memories_access',
    feature: ProductFeature.MEMORIES,
    status: EntitlementStatus.ACTIVE,
    startsAt: new Date('2026-06-18T00:00:00.000Z'),
    endsAt: null,
  } as Entitlement;
}

function buildOrder(): Order {
  const order = new Order();
  order.id = 'order-id';
  order.ownerUserId = 'user-id';
  order.productId = 'memories_access';
  order.paymentProvider = 'local';
  order.paymentStatus = OrderPaymentStatus.PAID;
  order.amountCents = 9900;
  order.currency = 'USD';
  order.targetRecordingId = 'recording-id';
  order.createdAt = new Date('2026-06-18T00:00:00.000Z');
  order.updatedAt = new Date('2026-06-18T00:00:00.000Z');
  return order;
}

function buildAnalysisJob(overrides: Partial<AnalysisJob> = {}): AnalysisJob {
  return {
    id: 'analysis-job-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    recordingId: 'recording-id',
    orderId: 'order-id',
    entitlementId: 'entitlement-id',
    status: AnalysisJobStatus.QUEUED,
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
  } as AnalysisJob;
}

function expectStatusFilterIncludes(
  repositoryMethod: jest.Mock,
  status: AnalysisJobStatus,
): void {
  const callIndex = repositoryMethod.mock.calls.length - 1;
  const [query] = repositoryMethod.mock.calls[callIndex];
  expect(query.where.status.value).toEqual(expect.arrayContaining([status]));
}
