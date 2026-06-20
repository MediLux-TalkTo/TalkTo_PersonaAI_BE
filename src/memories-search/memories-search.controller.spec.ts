import {
  ValidationPipe,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MemoriesSearchController } from './memories-search.controller';
import { MemoriesSearchService } from './memories-search.service';

describe('MemoriesSearchController', () => {
  let app: INestApplication;
  const memoriesSearchService = {
    getStatus: jest.fn(),
    search: jest.fn(),
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
    memoriesSearchService.getStatus.mockResolvedValue({
      entitled: true,
      searchable: true,
      indexedSegmentCount: 3,
      completedJobCount: 1,
      latestCompletedAt: '2026-06-18T00:00:00.000Z',
    });
    memoriesSearchService.search.mockResolvedValue({
      status: 'answered',
      answer: 'I found 1 relevant memory segment. A memory.',
      resultCount: 1,
      lowConfidence: false,
      segments: [],
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [MemoriesSearchController],
      providers: [
        { provide: MemoriesSearchService, useValue: memoriesSearchService },
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

  it('returns paid Memories status for the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/memories/status?subjectId=8a1c6f1d-0e23-4db9-aabc-c0d066020001')
      .expect(200);

    expect(memoriesSearchService.getStatus).toHaveBeenCalledWith('user-id', {
      subjectId: '8a1c6f1d-0e23-4db9-aabc-c0d066020001',
    });
    expect(response.body.data).toMatchObject({
      entitled: true,
      searchable: true,
      indexedSegmentCount: 3,
    });
  });

  it('rejects malformed search input before querying paid Memories', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/memories/search')
      .send({ q: '', ownerUserId: 'attacker' })
      .expect(400);

    expect(memoriesSearchService.search).not.toHaveBeenCalled();
  });

  it('searches paid Memories using the authenticated user id', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/memories/search')
      .send({ q: 'spring flowers', limit: 3 })
      .expect(200);

    expect(memoriesSearchService.search).toHaveBeenCalledWith('user-id', {
      q: 'spring flowers',
      limit: 3,
    });
  });
});
