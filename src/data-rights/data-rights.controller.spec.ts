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
import { DataRightsController } from './data-rights.controller';
import { DataRightsService } from './data-rights.service';

describe('DataRightsController', () => {
  let app: INestApplication;
  const dataRightsService = {
    getResearchExportPreference: jest.fn(),
    optInResearchExport: jest.fn(),
    withdrawResearchExport: jest.fn(),
    previewRedactedResearchExport: jest.fn(),
    createDataDeletionRequest: jest.fn(),
    updateDataDeletionRequest: jest.fn(),
    updateProviderDeletionRecord: jest.fn(),
  };
  const authGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      context.switchToHttp().getRequest<{ user?: { userId: string; role: Role } }>().user =
        {
          userId: 'user-id',
          role: Role.ADMIN,
        };
      return true;
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    dataRightsService.getResearchExportPreference.mockResolvedValue({
      optedIn: false,
      optedInAt: null,
      withdrawnAt: null,
    });
    dataRightsService.optInResearchExport.mockResolvedValue({
      optedIn: true,
      optedInAt: '2026-06-18T00:00:00.000Z',
      withdrawnAt: null,
    });
    dataRightsService.withdrawResearchExport.mockResolvedValue({
      optedIn: false,
      optedInAt: '2026-06-18T00:00:00.000Z',
      withdrawnAt: '2026-06-18T01:00:00.000Z',
    });
    dataRightsService.previewRedactedResearchExport.mockResolvedValue({ rows: [] });
    dataRightsService.createDataDeletionRequest.mockResolvedValue({
      deletionRequest: { id: 'deletion-request-id' },
      providerDeletionRecords: [],
    });
    dataRightsService.updateDataDeletionRequest.mockResolvedValue({
      id: 'deletion-request-id',
    });
    dataRightsService.updateProviderDeletionRecord.mockResolvedValue({
      id: 'provider-record-id',
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [DataRightsController],
      providers: [{ provide: DataRightsService, useValue: dataRightsService }],
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

  it('returns and updates the authenticated user research export preference', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/data-rights/research-export')
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/data-rights/research-export/opt-in')
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/data-rights/research-export/withdraw')
      .expect(201);

    expect(dataRightsService.getResearchExportPreference).toHaveBeenCalledWith(
      'user-id',
    );
    expect(dataRightsService.optInResearchExport).toHaveBeenCalledWith('user-id');
    expect(dataRightsService.withdrawResearchExport).toHaveBeenCalledWith('user-id');
  });

  it('uses admin actor and validates preview query params', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/v1/admin/data-rights/research-export-preview?limit=5&subjectId=3b1cae30-77ef-4556-bbb1-4c3cb048e713',
      )
      .expect(200);

    expect(dataRightsService.previewRedactedResearchExport).toHaveBeenCalledWith(
      'user-id',
      {
        limit: 5,
        subjectId: '3b1cae30-77ef-4556-bbb1-4c3cb048e713',
      },
    );

    await request(app.getHttpServer())
      .get('/api/v1/admin/data-rights/research-export-preview?limit=500')
      .expect(400);
  });

  it('creates and administers deletion requests with authenticated actors', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/data-deletion-requests')
      .send({ scope: 'account', confirmation: 'DELETE MY DATA' })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/data-deletion-requests/deletion-request-id')
      .send({ status: 'processing' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/provider-deletion-records/provider-record-id')
      .send({ status: 'completed' })
      .expect(200);

    expect(dataRightsService.createDataDeletionRequest).toHaveBeenCalledWith(
      'user-id',
      { scope: 'account', confirmation: 'DELETE MY DATA' },
    );
    expect(dataRightsService.updateDataDeletionRequest).toHaveBeenCalledWith(
      'deletion-request-id',
      'user-id',
      { status: 'processing' },
    );
    expect(dataRightsService.updateProviderDeletionRecord).toHaveBeenCalledWith(
      'provider-record-id',
      'user-id',
      { status: 'completed' },
    );
  });
});
