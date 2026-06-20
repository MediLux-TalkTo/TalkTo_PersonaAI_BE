import { ConflictException, ValidationPipe } from '@nestjs/common';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';

describe('RecordingsController', () => {
  let app: INestApplication;
  const recordingsService = {
    getUploadGuide: jest.fn(),
    requestPreviewAnalysis: jest.fn(),
    retryUploadIntent: jest.fn(),
  };
  const authGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const requestContext = context
        .switchToHttp()
        .getRequest<{ user?: { userId: string } }>();
      requestContext.user = { userId: 'user-id' };
      return true;
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    recordingsService.requestPreviewAnalysis.mockRejectedValue(
      new ConflictException({
        code: 'feature_deferred',
        message: 'Preview analysis is deferred for v1.0.',
        details: {
          feature: 'preview_analysis',
        },
      }),
    );
    recordingsService.getUploadGuide.mockReturnValue({
      supported_mime_types: ['audio/mp4'],
      max_file_size_bytes: 536870912,
      single_file_only: true,
      sources: ['app_recording'],
      platforms: ['ios'],
      lifecycle: ['uploading', 'completed'],
      failure_codes: ['object_missing'],
      checksum_statuses: ['not_supported'],
    });
    recordingsService.retryUploadIntent.mockResolvedValue({
      recording: {
        id: 'recording-id',
        subject_id: 'subject-id',
        upload_status: 'UPLOADING',
      },
      method: 'PUT',
      uploadUrl: 'https://upload.example',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      expiresAt: new Date('2026-07-05T00:00:00.000Z'),
      uploadIntentId: 'retry-intent-id',
      status: 'uploading',
      source: 'share_extension',
      platform: 'ios',
      singleFile: true,
      failureCode: null,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [RecordingsController],
      providers: [{ provide: RecordingsService, useValue: recordingsService }],
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

  it('returns feature_deferred when Preview analysis is requested', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/recordings/recording-id/preview-analysis')
      .expect(409);

    expect(recordingsService.requestPreviewAnalysis).toHaveBeenCalledWith(
      'recording-id',
      'user-id',
    );
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'feature_deferred',
        details: {
          feature: 'preview_analysis',
        },
      },
    });
  });

  it('returns upload guide constraints', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/upload-guide')
      .expect(200);

    expect(recordingsService.getUploadGuide).toHaveBeenCalled();
    expect(response.body).toMatchObject({
      success: true,
      data: {
        supported_mime_types: ['audio/mp4'],
        max_file_size_bytes: 536870912,
        single_file_only: true,
      },
    });
  });

  it('returns retry upload intent with the documented recording shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/recordings/recording-id/upload-intents/intent-id/retry')
      .expect(200);

    expect(recordingsService.retryUploadIntent).toHaveBeenCalledWith(
      'recording-id',
      'user-id',
      'intent-id',
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        recording: {
          id: 'recording-id',
          subject_id: 'subject-id',
          upload_status: 'UPLOADING',
        },
        uploadIntentId: 'retry-intent-id',
        status: 'uploading',
      },
    });
  });
});
