import { ValidationPipe } from '@nestjs/common';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConsentFeature, ConsentType } from '../common/enums/consent.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';

describe('ConsentsController', () => {
  let app: INestApplication;
  const consentsService = {
    getLatest: jest.fn(),
    save: jest.fn(),
    getRequirements: jest.fn(),
    accept: jest.fn(),
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

    const moduleRef = await Test.createTestingModule({
      controllers: [ConsentsController],
      providers: [{ provide: ConsentsService, useValue: consentsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
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

  it('serves feature consent requirements through the REST surface', async () => {
    consentsService.getRequirements.mockResolvedValue({
      feature: ConsentFeature.MEMORIES,
      subject_id: '86a27e07-f168-445f-b7f4-8d67c6cb7c31',
      requirements: [
        {
          consent_type: ConsentType.AI_ANALYSIS_SERVICE,
          required: true,
          status: 'missing',
          title: 'AI 분석 동의',
          summary: 'Memories 검색을 위해 STT, 요약, 임베딩 처리를 수행합니다.',
          blocking_behavior: 'block_if_missing',
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/consents/requirements')
      .query({
        feature: ConsentFeature.MEMORIES,
        subject_id: '86a27e07-f168-445f-b7f4-8d67c6cb7c31',
      })
      .expect(200);

    expect(consentsService.getRequirements).toHaveBeenCalledWith('user-id', {
      feature: ConsentFeature.MEMORIES,
      subject_id: '86a27e07-f168-445f-b7f4-8d67c6cb7c31',
    });
    expect(response.body.data.requirements[0].consent_type).toBe(
      ConsentType.AI_ANALYSIS_SERVICE,
    );
  });

  it('accepts versioned purpose consents through the REST surface', async () => {
    consentsService.accept.mockResolvedValue({
      accepted_features: [ConsentFeature.MEMORIES],
      consents: [
        {
          id: 'consent-id',
          userId: 'user-id',
          subjectId: '86a27e07-f168-445f-b7f4-8d67c6cb7c31',
          consentType: ConsentType.AI_ANALYSIS_SERVICE,
          feature: ConsentFeature.MEMORIES,
          required: true,
          status: 'accepted',
          version: '2026-06-07',
          personaDisclaimerAccepted: false,
          conversationStorageAccepted: false,
          voiceSynthesisAccepted: false,
          acceptedAt: new Date('2026-06-17T00:00:00.000Z'),
          withdrawnAt: null,
        },
      ],
    });

    await request(app.getHttpServer())
      .post('/consents/accept')
      .send({
        subject_id: '86a27e07-f168-445f-b7f4-8d67c6cb7c31',
        consents: [
          {
            consent_type: ConsentType.AI_ANALYSIS_SERVICE,
            version: '2026-06-07',
          },
        ],
      })
      .expect(201);

    expect(consentsService.accept).toHaveBeenCalledWith('user-id', {
      subject_id: '86a27e07-f168-445f-b7f4-8d67c6cb7c31',
      consents: [
        {
          consent_type: ConsentType.AI_ANALYSIS_SERVICE,
          version: '2026-06-07',
        },
      ],
    });
  });
});
