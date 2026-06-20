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
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminVoicePersonaController } from './admin-voice-persona.controller';
import {
  VoicePersonaBuildStatus,
  VoicePersonaReviewStatus,
} from './voice-persona.constants';
import { VoicePersonaService } from './voice-persona.service';

describe('AdminVoicePersonaController', () => {
  let app: INestApplication;
  const voicePersonaService = {
    reviewDocument: jest.fn(),
    reviewVoiceSample: jest.fn(),
    updateBuildStatus: jest.fn(),
    upsertPersonaBible: jest.fn(),
    reviewPersonaBible: jest.fn(),
    registerProviderAsset: jest.fn(),
  };
  const authGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      context.switchToHttp().getRequest<{ user?: { userId: string; role: Role } }>().user =
        {
          userId: 'admin-id',
          role: Role.ADMIN,
        };
      return true;
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const value of Object.values(voicePersonaService)) {
      value.mockResolvedValue({ id: 'resource-id' });
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminVoicePersonaController],
      providers: [{ provide: VoicePersonaService, useValue: voicePersonaService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
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

  it('routes document/sample review through the authenticated admin actor', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/voice-persona/documents/document-id/review')
      .send({ status: VoicePersonaReviewStatus.APPROVED })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/voice-persona/voice-samples/sample-id/review')
      .send({ status: VoicePersonaReviewStatus.REJECTED })
      .expect(200);

    expect(voicePersonaService.reviewDocument).toHaveBeenCalledWith(
      'document-id',
      'admin-id',
      { status: VoicePersonaReviewStatus.APPROVED },
    );
    expect(voicePersonaService.reviewVoiceSample).toHaveBeenCalledWith(
      'sample-id',
      'admin-id',
      { status: VoicePersonaReviewStatus.REJECTED },
    );
  });

  it('validates and routes build, Bible, and provider asset actions', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/voice-persona/applications/application-id/build-status')
      .send({ status: VoicePersonaBuildStatus.PENDING_ADMIN_REVIEW })
      .expect(200);
    await request(app.getHttpServer())
      .put('/api/v1/admin/voice-persona/applications/application-id/persona-bible')
      .send({ contentSummary: 'Safe persona bible summary.' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/voice-persona/persona-bibles/bible-id/review')
      .send({ status: VoicePersonaReviewStatus.APPROVED })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/admin/voice-persona/applications/application-id/provider-assets')
      .send({
        providerName: 'manual-provider',
        externalAssetId: 'asset-123',
        providerSecret: 'should-not-pass',
      })
      .expect(400);

    expect(voicePersonaService.updateBuildStatus).toHaveBeenCalledWith(
      'application-id',
      'admin-id',
      { status: VoicePersonaBuildStatus.PENDING_ADMIN_REVIEW },
    );
    expect(voicePersonaService.upsertPersonaBible).toHaveBeenCalledWith(
      'application-id',
      'admin-id',
      { contentSummary: 'Safe persona bible summary.' },
    );
    expect(voicePersonaService.reviewPersonaBible).toHaveBeenCalledWith(
      'bible-id',
      'admin-id',
      { status: VoicePersonaReviewStatus.APPROVED },
    );
    expect(voicePersonaService.registerProviderAsset).not.toHaveBeenCalled();
  });
});
