import { Test } from '@nestjs/testing';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisJobsController } from './analysis-jobs.controller';
import { AnalysisJobsService } from './analysis-jobs.service';

describe('AnalysisJobsController', () => {
  const service = {
    retryJob: jest.fn(),
    toDto: jest.fn((value) => value),
  };
  let controller: AnalysisJobsController;

  beforeEach(async () => {
    jest.resetAllMocks();
    service.toDto.mockImplementation((value) => value);
    service.retryJob.mockResolvedValue({
      id: 'job-id',
      status: AnalysisJobStatus.QUEUED,
      retryCount: 2,
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [AnalysisJobsController],
      providers: [{ provide: AnalysisJobsService, useValue: service }],
    }).compile();

    controller = moduleRef.get(AnalysisJobsController);
  });

  it('routes retry requests through the authenticated owner surface', async () => {
    await expect(
      controller.retryJob('job-id', { userId: 'user-id' }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        id: 'job-id',
        status: AnalysisJobStatus.QUEUED,
        retryCount: 2,
      },
      meta: {
        timestamp: expect.any(String),
      },
    });

    expect(service.retryJob).toHaveBeenCalledWith('job-id', 'user-id');
  });
});
