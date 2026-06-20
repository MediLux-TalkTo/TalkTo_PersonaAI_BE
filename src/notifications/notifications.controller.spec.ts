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
import { NotificationType } from './notification.constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let app: INestApplication;
  const notificationsService = {
    listForUser: jest.fn(),
    markRead: jest.fn(),
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
    notificationsService.listForUser.mockResolvedValue([
      {
        id: 'notification-id',
        type: NotificationType.ANALYSIS_COMPLETED,
        title: 'Ready',
        body: 'Done',
        payload: {},
      },
    ]);
    notificationsService.markRead.mockResolvedValue({
      id: 'notification-id',
      readAt: new Date('2026-06-18T00:00:00.000Z'),
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notificationsService },
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

  it('lists notifications for the authenticated user', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications?limit=10&unreadOnly=true')
      .expect(200);

    expect(notificationsService.listForUser).toHaveBeenCalledWith('user-id', {
      limit: 10,
      unreadOnly: true,
    });
  });

  it('marks an owned notification as read', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/notifications/notification-id/read')
      .expect(200);

    expect(notificationsService.markRead).toHaveBeenCalledWith(
      'user-id',
      'notification-id',
    );
  });
});
