import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisWorkerTransitionsController } from './analysis-worker-transitions.controller';
import { AnalysisWorkerTransitionsService } from './analysis-worker-transitions.service';

describe('AnalysisWorkerTransitionsController', () => {
  const successEnvelope = (data: { id: string; status: AnalysisJobStatus }) => ({
    success: true,
    data,
    meta: {
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ),
    },
  });

  const service = {
    markPreprocessing: jest.fn(),
    markStt: jest.fn(),
    markRedaction: jest.fn(),
    markSegmenting: jest.fn(),
    markIndexing: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    toDto: jest.fn((value: unknown) => value),
  };
  let controller: AnalysisWorkerTransitionsController;

  beforeEach(async () => {
    jest.resetAllMocks();
    service.toDto.mockImplementation((value: unknown) => value);
    service.markIndexing.mockResolvedValue({
      id: 'job-id',
      status: AnalysisJobStatus.INDEXING,
    });
    service.markPreprocessing.mockResolvedValue({
      id: 'job-id',
      status: AnalysisJobStatus.PREPROCESSING,
    });
    service.markStt.mockResolvedValue({
      id: 'job-id',
      status: AnalysisJobStatus.STT_PROCESSING,
    });
    service.markRedaction.mockResolvedValue({
      id: 'job-id',
      status: AnalysisJobStatus.REDACTION_PENDING,
    });
    service.markSegmenting.mockResolvedValue({
      id: 'job-id',
      status: AnalysisJobStatus.SEGMENTING,
    });
    service.markCompleted.mockResolvedValue({
      id: 'job-id',
      status: AnalysisJobStatus.COMPLETED,
    });
    service.markFailed.mockResolvedValue({
      id: 'job-id',
      status: AnalysisJobStatus.FAILED_RETRYABLE,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [AnalysisWorkerTransitionsController],
      providers: [{ provide: AnalysisWorkerTransitionsService, useValue: service }],
    }).compile();

    controller = moduleRef.get(AnalysisWorkerTransitionsController);
  });

  it('routes admin worker indexing transitions through the worker service', async () => {
    const dto = {
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
    };

    await expect(controller.markIndexing('job-id', dto)).resolves.toEqual(
      successEnvelope({ id: 'job-id', status: AnalysisJobStatus.INDEXING }),
    );

    expect(service.markIndexing).toHaveBeenCalledWith('job-id', dto);
  });

  it('routes every worker transition endpoint through the worker service', async () => {
    const preprocessDto = { workerId: 'worker-1' };
    const sttDto = {
      segments: [
        {
          segmentIndex: 0,
          startMs: 0,
          endMs: 1000,
          transcriptText: 'Synthetic transcript.',
        },
      ],
    };
    const segmentingDto = {
      segments: [
        {
          segmentIndex: 0,
          sourceTranscriptSegmentIds: [
            '11111111-1111-4111-8111-111111111111',
          ],
          startMs: 0,
          endMs: 1000,
          memoryText: 'Synthetic memory.',
        },
      ],
    };
    const failedDto = {
      failureCode: 'worker_timeout',
      failureMessage: 'Synthetic worker timeout.',
    };

    await expect(
      controller.markPreprocessing('job-id', preprocessDto),
    ).resolves.toEqual(
      successEnvelope({ id: 'job-id', status: AnalysisJobStatus.PREPROCESSING }),
    );
    await expect(controller.markStt('job-id', sttDto)).resolves.toEqual(
      successEnvelope({ id: 'job-id', status: AnalysisJobStatus.STT_PROCESSING }),
    );
    await expect(controller.markRedaction('job-id')).resolves.toEqual(
      successEnvelope({
        id: 'job-id',
        status: AnalysisJobStatus.REDACTION_PENDING,
      }),
    );
    await expect(
      controller.markSegmenting('job-id', segmentingDto),
    ).resolves.toEqual(
      successEnvelope({ id: 'job-id', status: AnalysisJobStatus.SEGMENTING }),
    );
    await expect(controller.markCompleted('job-id')).resolves.toEqual(
      successEnvelope({ id: 'job-id', status: AnalysisJobStatus.COMPLETED }),
    );
    await expect(controller.markFailed('job-id', failedDto)).resolves.toEqual(
      successEnvelope({ id: 'job-id', status: AnalysisJobStatus.FAILED_RETRYABLE }),
    );

    expect(service.markPreprocessing).toHaveBeenCalledWith('job-id', preprocessDto);
    expect(service.markStt).toHaveBeenCalledWith('job-id', sttDto);
    expect(service.markRedaction).toHaveBeenCalledWith('job-id');
    expect(service.markSegmenting).toHaveBeenCalledWith('job-id', segmentingDto);
    expect(service.markCompleted).toHaveBeenCalledWith('job-id');
    expect(service.markFailed).toHaveBeenCalledWith('job-id', failedDto);
  });

  it('requires JWT auth, roles guard, and admin role metadata', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AnalysisWorkerTransitionsController,
    );
    const roles = Reflect.getMetadata(ROLES_KEY, AnalysisWorkerTransitionsController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.ADMIN]);
  });
});
