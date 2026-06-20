import {
  ValidationPipe,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Role } from '../common/enums/role.enum';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AdminAnalysisJobsController } from './admin-analysis-jobs.controller';
import { AnalysisJobStatusService } from './analysis-job-status.service';
import { MemoriesAnalysisJobsController } from './memories-analysis-jobs.controller';

describe('Analysis job status HTTP controllers', () => {
  let app: INestApplication;
  const statusService = {
    listForOwner: jest.fn(),
    listForAdmin: jest.fn(),
    adminRetryJob: jest.fn(),
  };
  const authGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const requestContext = context
        .switchToHttp()
        .getRequest<{ headers: Record<string, string | undefined>; user?: unknown }>();
      requestContext.user = {
        userId: 'actor-id',
        role: requestContext.headers['x-test-role'] ?? Role.FAMILY,
      };
      return true;
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    statusService.listForOwner.mockResolvedValue([buildStatusDto('owner-job-id')]);
    statusService.listForAdmin.mockResolvedValue([buildStatusDto('admin-job-id')]);
    statusService.adminRetryJob.mockResolvedValue({
      ...buildStatusDto('retry-job-id'),
      status: AnalysisJobStatus.QUEUED,
      retryCount: 2,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [MemoriesAnalysisJobsController, AdminAnalysisJobsController],
      providers: [
        { provide: AnalysisJobStatusService, useValue: statusService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns only the authenticated owner analysis jobs with failure codes and progress', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/memories/analysis-jobs?status=failed_retryable&limit=10')
      .expect(200);

    expect(statusService.listForOwner).toHaveBeenCalledWith('actor-id', {
      status: AnalysisJobStatus.FAILED_RETRYABLE,
      limit: 10,
    });
    expect(response.body).toMatchObject({
      success: true,
      data: [
        {
          id: 'owner-job-id',
          status: AnalysisJobStatus.FAILED_RETRYABLE,
          failureCode: 'worker_timeout',
          progress: { percent: 90, stage: AnalysisJobStatus.FAILED_RETRYABLE },
        },
      ],
    });
  });

  it('rejects malformed status filters before querying analysis jobs', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/memories/analysis-jobs?status=bogus')
      .expect(400);

    expect(statusService.listForOwner).not.toHaveBeenCalled();
  });

  it('rejects caller-supplied owner filters on the owner status endpoint', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/v1/memories/analysis-jobs?ownerUserId=8a1c6f1d-0e23-4db9-aabc-c0d066010099',
      )
      .expect(400);

    expect(statusService.listForOwner).not.toHaveBeenCalled();
  });

  it('allows ops and admin roles to list all analysis jobs', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/analysis-jobs?status=queued')
      .set('x-test-role', Role.OPS)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/admin/analysis-jobs?status=failed_retryable')
      .set('x-test-role', Role.ADMIN)
      .expect(200);

    expect(statusService.listForAdmin).toHaveBeenNthCalledWith(1, {
      status: AnalysisJobStatus.QUEUED,
    });
    expect(statusService.listForAdmin).toHaveBeenNthCalledWith(2, {
      status: AnalysisJobStatus.FAILED_RETRYABLE,
    });
  });

  it('blocks family users from admin analysis job status', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/analysis-jobs')
      .set('x-test-role', Role.FAMILY)
      .expect(401);

    expect(statusService.listForAdmin).not.toHaveBeenCalled();
  });

  it('audits admin retry requests and rejects malformed job ids', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/analysis-jobs/not-a-uuid/retry')
      .set('x-test-role', Role.ADMIN)
      .expect(400);

    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/analysis-jobs/8a1c6f1d-0e23-4db9-aabc-c0d066010001/retry')
      .set('x-test-role', Role.ADMIN)
      .expect(200);

    expect(statusService.adminRetryJob).toHaveBeenCalledTimes(1);
    expect(statusService.adminRetryJob).toHaveBeenCalledWith(
      '8a1c6f1d-0e23-4db9-aabc-c0d066010001',
      { userId: 'actor-id', role: Role.ADMIN },
    );
    expect(response.body.data).toMatchObject({
      id: 'retry-job-id',
      status: AnalysisJobStatus.QUEUED,
      retryCount: 2,
    });
  });
});

function buildStatusDto(id: string) {
  return {
    id,
    ownerUserId: 'owner-id',
    recordingId: 'recording-id',
    subjectId: 'subject-id',
    orderId: 'order-id',
    entitlementId: 'entitlement-id',
    status: AnalysisJobStatus.FAILED_RETRYABLE,
    progress: {
      stage: AnalysisJobStatus.FAILED_RETRYABLE,
      percent: 90,
      terminal: false,
    },
    retryCount: 1,
    maxRetries: 3,
    failureCode: 'worker_timeout',
    failureMessage: 'Worker timed out.',
    statusChangedAt: '2026-06-18T00:00:00.000Z',
    completedAt: null,
    failedAt: '2026-06-18T00:01:00.000Z',
    cancelledAt: null,
    createdAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T00:01:00.000Z',
  };
}
