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
import { PreRegistrationsController } from './pre-registrations.controller';
import { PreRegistrationsService } from './pre-registrations.service';

describe('PreRegistrationsController', () => {
  let app: INestApplication;
  const preRegistrationsService = {
    create: jest.fn(),
    listForAdmin: jest.fn(),
    updateForAdmin: jest.fn(),
  };
  const authGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      context.switchToHttp().getRequest<{ user?: { userId: string; role: Role } }>().user =
        {
          userId: 'admin-user-id',
          role: Role.ADMIN,
        };
      return true;
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    preRegistrationsService.create.mockResolvedValue({
      registrationId: 'registration-id',
      status: 'received',
      participationType: 'early_access',
      benefitStatus: 'not_applicable',
      nextStep: 'wait_for_contact',
    });
    preRegistrationsService.listForAdmin.mockResolvedValue({
      items: [],
      total: 0,
    });
    preRegistrationsService.updateForAdmin.mockResolvedValue({
      id: 'registration-id',
      status: 'contacted',
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [PreRegistrationsController],
      providers: [
        { provide: PreRegistrationsService, useValue: preRegistrationsService },
      ],
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

  it('accepts an unauthenticated early-access pre-registration', async () => {
    const payload = {
      participationType: 'early_access',
      name: 'Hong Gil Dong',
      contact: 'email@talkto.com',
      reason: 'voice_persona_interest',
      contactConsent: true,
      contactConsentVersion: 'landing_beta_contact_v1',
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/pre-registrations')
      .send(payload)
      .expect(201);

    expect(preRegistrationsService.create).toHaveBeenCalledWith(payload, undefined);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        registrationId: 'registration-id',
        status: 'received',
      },
    });
  });

  it('rejects an array in place of nested survey answers', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pre-registrations')
      .send({
        participationType: 'survey_10',
        name: 'Hong Gil Dong',
        contact: 'email@talkto.com',
        reason: 'voice_persona_interest',
        contactConsent: true,
        contactConsentVersion: 'landing_beta_contact_v1',
        survey: [],
      })
      .expect(400);

    expect(preRegistrationsService.create).not.toHaveBeenCalled();
  });

  it('serves and updates pre-registrations for admins', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/pre-registrations?participationType=interview_20&limit=10')
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/pre-registrations/registration-id')
      .send({ status: 'contacted' })
      .expect(200);

    expect(preRegistrationsService.listForAdmin).toHaveBeenCalledWith('admin-user-id', {
      participationType: 'interview_20',
      limit: 10,
    });
    expect(preRegistrationsService.updateForAdmin).toHaveBeenCalledWith(
      'registration-id',
      'admin-user-id',
      { status: 'contacted' },
    );
  });
});
