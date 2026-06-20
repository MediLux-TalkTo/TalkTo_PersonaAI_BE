import { createHmac } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AnalysisJobsService } from '../analysis/analysis-jobs.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { AppEventsService } from '../events/events.service';
import { OrderPaymentStatus } from '../orders/order.constants';
import { Order } from '../orders/order.entity';
import { ProductFeature } from '../products/product.constants';
import { Product } from '../products/product.entity';
import { PaymentEventType } from './payment-event.constants';
import { PaymentEvent } from './payment-event.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController HTTP webhook surface', () => {
  const paymentEventsRepository = {
    create: jest.fn((value) => value),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({
      ...value,
      id: value.id ?? 'payment-event-id',
    })),
  };
  const ordersRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const productsRepository = {
    findOne: jest.fn(),
  };
  const entitlementsRepository = {
    create: jest.fn((value) => value),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({
      ...value,
      id: 'entitlement-id',
    })),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === PaymentEvent) {
        return paymentEventsRepository;
      }
      if (entity === Order) {
        return ordersRepository;
      }
      if (entity === Product) {
        return productsRepository;
      }
      return entitlementsRepository;
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (value: typeof manager) => Promise<unknown>) =>
      callback(manager),
    ),
  };
  const configService = {
    get: jest.fn((key: string, fallback: string | number) => fallback),
  };
  const appEventsService = {
    emit: jest.fn(),
  };
  const analysisJobsService = {
    createQueuedForPaidRecording: jest.fn(),
  };

  let app: INestApplication;

  beforeEach(async () => {
    jest.resetAllMocks();
    manager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === PaymentEvent) {
        return paymentEventsRepository;
      }
      if (entity === Order) {
        return ordersRepository;
      }
      if (entity === Product) {
        return productsRepository;
      }
      return entitlementsRepository;
    });
    dataSource.transaction.mockImplementation(
      async (callback: (value: typeof manager) => Promise<unknown>) =>
        callback(manager),
    );
    configService.get.mockImplementation(
      (key: string, fallback: string | number) => fallback,
    );
    paymentEventsRepository.findOne.mockResolvedValue(null);
    paymentEventsRepository.create.mockImplementation(
      (value: Record<string, unknown>) => value,
    );
    paymentEventsRepository.save.mockImplementation(
      async (value: Record<string, unknown>) => ({
        ...value,
        id: value.id ?? 'payment-event-id',
      }),
    );
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-id',
      ownerUserId: 'user-id',
      productId: 'memories_access',
      paymentStatus: OrderPaymentStatus.PENDING,
      targetRecordingId: 'recording-id',
    });
    productsRepository.findOne.mockResolvedValue({
      id: 'memories_access',
      feature: ProductFeature.MEMORIES,
    });
    entitlementsRepository.findOne.mockResolvedValue(null);
    entitlementsRepository.create.mockImplementation(
      (value: Record<string, unknown>) => value,
    );
    entitlementsRepository.save.mockImplementation(
      async (value: Record<string, unknown>) => ({
        ...value,
        id: 'entitlement-id',
      }),
    );
    appEventsService.emit.mockResolvedValue(null);
    analysisJobsService.createQueuedForPaidRecording.mockResolvedValue({
      id: 'analysis-job-id',
      status: 'queued',
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: ConfigService, useValue: configService },
        { provide: AppEventsService, useValue: appEventsService },
        { provide: AnalysisJobsService, useValue: analysisJobsService },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('queues paid Memories analysis from a signed raw JSON webhook over HTTP', async () => {
    const rawPayload = [
      '{',
      '  "id": "payment-event-raw-http",',
      `  "type": "${PaymentEventType.PAYMENT_SUCCEEDED}",`,
      '  "orderId": "order-id",',
      '  "paymentId": "provider-payment-id"',
      '}',
    ].join('\n');
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signPayload(rawPayload, timestamp);

    const response = await request(app.getHttpServer())
      .post('/api/v1/payments/local/webhook')
      .set('content-type', 'application/json')
      .set('x-talkto-payment-event-id', 'payment-event-raw-http')
      .set('x-talkto-payment-timestamp', String(timestamp))
      .set('x-talkto-payment-signature', signature)
      .send(rawPayload)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        processed: true,
        eventId: 'payment-event-id',
        entitlementId: 'entitlement-id',
        analysisJobId: 'analysis-job-id',
      },
    });
    expect(response.body.meta.timestamp).toEqual(expect.any(String));
    expect(analysisJobsService.createQueuedForPaidRecording).toHaveBeenCalledWith(
      {
        ownerUserId: 'user-id',
        recordingId: 'recording-id',
        orderId: 'order-id',
        entitlementId: 'entitlement-id',
      },
      manager,
    );
  });

  it('rejects a bad signature on the real HTTP webhook route', async () => {
    const rawPayload = JSON.stringify({
      id: 'payment-event-bad-signature',
      type: PaymentEventType.PAYMENT_SUCCEEDED,
      orderId: 'order-id',
    });
    const timestamp = Math.floor(Date.now() / 1000);

    await request(app.getHttpServer())
      .post('/api/v1/payments/local/webhook')
      .set('content-type', 'application/json')
      .set('x-talkto-payment-event-id', 'payment-event-bad-signature')
      .set('x-talkto-payment-timestamp', String(timestamp))
      .set('x-talkto-payment-signature', '0'.repeat(64))
      .send(rawPayload)
      .expect(400);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(analysisJobsService.createQueuedForPaidRecording).not.toHaveBeenCalled();
  });
});

function signPayload(payload: string, timestamp: number): string {
  return createHmac('sha256', 'local-payment-webhook-secret')
    .update(`${timestamp}.${payload}`)
    .digest('hex');
}
