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
import { VoicePersonaController } from './voice-persona.controller';
import { VoicePersonaService } from './voice-persona.service';

describe('VoicePersonaController', () => {
  let app: INestApplication;
  const voicePersonaService = {
    createApplication: jest.fn(),
    createDocumentUploadIntent: jest.fn(),
    upsertIntake: jest.fn(),
    submitIntake: jest.fn(),
    createTargetVoiceSample: jest.fn(),
    getBuildStatus: jest.fn(),
    getFamilyReview: jest.fn(),
    approveFamilyReview: jest.fn(),
    requestFamilyReviewChanges: jest.fn(),
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
    voicePersonaService.createApplication.mockResolvedValue({ id: 'application-id' });
    voicePersonaService.createDocumentUploadIntent.mockResolvedValue({
      document: { id: 'document-id' },
      uploadUrl: 'local-upload://voice-persona/documents/document.pdf',
      method: 'PUT',
    });
    voicePersonaService.upsertIntake.mockResolvedValue({ id: 'intake-id' });
    voicePersonaService.submitIntake.mockResolvedValue({ id: 'intake-id' });
    voicePersonaService.createTargetVoiceSample.mockResolvedValue({ id: 'sample-id' });
    voicePersonaService.getBuildStatus.mockResolvedValue({
      applicationId: 'application-id',
      buildStatus: 'locked_until_requirements',
      lockedReasons: ['documents_not_approved'],
    });
    voicePersonaService.getFamilyReview.mockResolvedValue({
      applicationId: 'application-id',
      contentSummary: 'Family-safe summary',
    });
    voicePersonaService.approveFamilyReview.mockResolvedValue({
      runtimeConfig: { enabled: true },
    });
    voicePersonaService.requestFamilyReviewChanges.mockResolvedValue({
      status: 'changes_requested',
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [VoicePersonaController],
      providers: [{ provide: VoicePersonaService, useValue: voicePersonaService }],
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

  it('creates an application for the authenticated user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/voice-persona/applications')
      .send({ subjectId: '3b1cae30-77ef-4556-bbb1-4c3cb048e713' })
      .expect(201);

    expect(voicePersonaService.createApplication).toHaveBeenCalledWith('user-id', {
      subjectId: '3b1cae30-77ef-4556-bbb1-4c3cb048e713',
    });
  });

  it('validates intake and voice sample payloads before service calls', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/voice-persona/applications/application-id/intake')
      .send({ sections: [] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/voice-persona/applications/application-id/voice-samples')
      .send({ ownerUserId: 'attacker' })
      .expect(400);

    expect(voicePersonaService.upsertIntake).not.toHaveBeenCalled();
    expect(voicePersonaService.createTargetVoiceSample).not.toHaveBeenCalled();
  });

  it('exposes document intent, intake submit, sample, and build status endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/voice-persona/applications/application-id/documents/upload-intent')
      .send({
        filename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: '100',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/voice-persona/applications/application-id/intake/submit')
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/voice-persona/applications/application-id/voice-samples')
      .send({
        recordingId: '3b1cae30-77ef-4556-bbb1-4c3cb048e713',
        startMs: 12000,
        endMs: 25000,
      })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/v1/voice-persona/applications/application-id/build-status')
      .expect(200);
  });

  it('exposes family review view, approve, and request changes endpoints', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/voice-persona/applications/application-id/family-review')
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/voice-persona/applications/application-id/family-review/approve')
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/voice-persona/applications/application-id/family-review/request-changes')
      .send({ notes: 'Needs softer tone.' })
      .expect(200);

    expect(voicePersonaService.getFamilyReview).toHaveBeenCalledWith(
      'application-id',
      'user-id',
    );
    expect(voicePersonaService.approveFamilyReview).toHaveBeenCalledWith(
      'application-id',
      'user-id',
    );
    expect(voicePersonaService.requestFamilyReviewChanges).toHaveBeenCalledWith(
      'application-id',
      'user-id',
      { notes: 'Needs softer tone.' },
    );
  });
});
