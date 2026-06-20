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
import { PersonaRuntimeController } from './persona-runtime.controller';
import { PersonaRuntimeService } from './persona-runtime.service';

describe('PersonaRuntimeController', () => {
  let app: INestApplication;
  const personaRuntimeService = {
    createSession: jest.fn(),
    createMessage: jest.fn(),
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
    personaRuntimeService.createSession.mockResolvedValue({ id: 'session-id' });
    personaRuntimeService.createMessage.mockResolvedValue({ message: { id: 'message-id' } });

    const moduleRef = await Test.createTestingModule({
      controllers: [PersonaRuntimeController],
      providers: [{ provide: PersonaRuntimeService, useValue: personaRuntimeService }],
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

  it('creates runtime sessions and messages with authenticated user id', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/persona/sessions')
      .send({ applicationId: '3b1cae30-77ef-4556-bbb1-4c3cb048e713' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/persona/sessions/session-id/messages')
      .send({ text: 'Hello' })
      .expect(201);

    expect(personaRuntimeService.createSession).toHaveBeenCalledWith('user-id', {
      applicationId: '3b1cae30-77ef-4556-bbb1-4c3cb048e713',
    });
    expect(personaRuntimeService.createMessage).toHaveBeenCalledWith(
      'session-id',
      'user-id',
      { text: 'Hello' },
    );
  });
});
