import {
  ValidationPipe,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FeedbackRating } from '../common/enums/feedback.enum';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MemorySegmentsController } from './memory-segments.controller';
import { MemorySegmentsService } from './memory-segments.service';

describe('MemorySegmentsController', () => {
  let app: INestApplication;
  const memorySegmentsService = {
    createPlaybackUrl: jest.fn(),
    createFeedback: jest.fn(),
  };
  const authGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      context.switchToHttp().getRequest<{ user?: { userId: string } }>().user = {
        userId: 'user-id',
      };
      return true;
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    memorySegmentsService.createPlaybackUrl.mockResolvedValue({
      playbackUrl: '/audio/recording.m4a#t=8,32',
      expiresAt: '2026-06-18T00:00:00.000Z',
      ttlSeconds: 3600,
      downloadAllowed: false,
      segmentStartMs: 8000,
      segmentEndMs: 32000,
      bufferMs: 2000,
    });
    memorySegmentsService.createFeedback.mockResolvedValue({
      id: 'feedback-id',
      memorySegmentId: 'segment-id',
      userId: 'user-id',
      rating: FeedbackRating.UP,
      tags: [],
      comment: null,
      reportedStartMs: null,
      reportedEndMs: null,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [MemorySegmentsController],
      providers: [
        { provide: MemorySegmentsService, useValue: memorySegmentsService },
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

  it('issues playback URL using the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/memory-segments/segment-id/playback-url')
      .send({ bufferMs: 2000 })
      .expect(201);

    expect(memorySegmentsService.createPlaybackUrl).toHaveBeenCalledWith(
      'segment-id',
      'user-id',
      { bufferMs: 2000 },
    );
    expect(response.body.data).toMatchObject({
      playbackUrl: '/audio/recording.m4a#t=8,32',
      downloadAllowed: false,
    });
  });

  it('rejects non-whitelisted playback input', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/memory-segments/segment-id/playback-url')
      .send({ ownerUserId: 'attacker' })
      .expect(400);

    expect(memorySegmentsService.createPlaybackUrl).not.toHaveBeenCalled();
  });

  it('stores segment feedback using the authenticated user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/memory-segments/segment-id/feedback')
      .send({
        rating: FeedbackRating.UP,
        tags: ['helpful'],
        reportedStartMs: 1000,
      })
      .expect(201);

    expect(memorySegmentsService.createFeedback).toHaveBeenCalledWith(
      'segment-id',
      'user-id',
      {
        rating: FeedbackRating.UP,
        tags: ['helpful'],
        reportedStartMs: 1000,
      },
    );
  });
});
