import { createHmac } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AppEventsService } from '../events/events.service';
import { Order } from '../orders/order.entity';
import { AnalysisJobsService } from '../analysis/analysis-jobs.service';
import { ProductFeature } from '../products/product.constants';
import { Product } from '../products/product.entity';
import { Entitlement } from './entitlement.entity';
import {
  EntitlementStatus,
  PaymentEventType,
} from './payment-event.constants';
import { PaymentEvent } from './payment-event.entity';
import { assertLocalEntitlementMutationAllowed, PaymentsService } from './payments.service';

describe('assertLocalEntitlementMutationAllowed', () => {
  it('rejects local entitlement mutation in production', () => {
    expect(() =>
      assertLocalEntitlementMutationAllowed({
        nodeEnv: 'production',
        provider: 'local',
      }),
    ).toThrow(ForbiddenException);
  });

  it('allows local entitlement mutation outside production', () => {
    expect(() =>
      assertLocalEntitlementMutationAllowed({
        nodeEnv: 'test',
        provider: 'local',
      }),
    ).not.toThrow();
  });
});

describe('PaymentsService', () => {
  const paymentEventsRepository = {
    create: jest.fn((value) => value),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ ...value, id: value.id ?? 'payment-event-id' })),
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
    save: jest.fn(async (value) => ({ ...value, id: 'entitlement-id' })),
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
      if (entity === Entitlement) {
        return entitlementsRepository;
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

  let service: PaymentsService;

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
      if (entity === Entitlement) {
        return entitlementsRepository;
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
    paymentEventsRepository.create.mockImplementation(
      (value: Record<string, unknown>) => value,
    );
    paymentEventsRepository.save.mockImplementation(async (value: Record<string, unknown>) => ({
      ...value,
      id: value.id ?? 'payment-event-id',
    }));
    paymentEventsRepository.findOne.mockResolvedValue(null);
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-id',
      ownerUserId: 'user-id',
      productId: 'voice_persona_build',
    });
    productsRepository.findOne.mockResolvedValue({
      id: 'voice_persona_build',
      feature: ProductFeature.VOICE_PERSONA,
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
      providers: [
        PaymentsService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: ConfigService, useValue: configService },
        { provide: AppEventsService, useValue: appEventsService },
        { provide: AnalysisJobsService, useValue: analysisJobsService },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  it('emits sanitized payment success events after local webhook processing', async () => {
    const payload = JSON.stringify({
      id: 'payment-event-1',
      type: PaymentEventType.PAYMENT_SUCCEEDED,
      orderId: 'order-id',
      paymentId: 'provider-payment-id',
      providerSecret: 'sk-provider-secret',
      token: 'raw-token',
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', 'local-payment-webhook-secret')
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    await expect(
      service.handleLocalWebhook({
        payload,
        headers: {
          'x-talkto-payment-event-id': 'payment-event-1',
          'x-talkto-payment-timestamp': String(timestamp),
          'x-talkto-payment-signature': signature,
        },
      }),
    ).resolves.toEqual({
      processed: true,
      eventId: 'payment-event-id',
      entitlementId: 'entitlement-id',
    });

    expect(appEventsService.emit).toHaveBeenCalledWith({
      userId: 'user-id',
      name: 'payment.succeeded',
      orderId: 'order-id',
      payload: {
        provider: 'local',
        eventType: PaymentEventType.PAYMENT_SUCCEEDED,
        productId: 'voice_persona_build',
        feature: ProductFeature.VOICE_PERSONA,
        entitlementStatus: EntitlementStatus.ACTIVE,
        hasProviderPaymentId: true,
      },
    });
    expect(JSON.stringify(appEventsService.emit.mock.calls[0][0])).not.toContain(
      'sk-provider-secret',
    );
    expect(JSON.stringify(appEventsService.emit.mock.calls[0][0])).not.toContain(
      'raw-token',
    );
  });

  it('creates a queued analysis job for Memories only after verified payment creates an entitlement', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-id',
      ownerUserId: 'user-id',
      productId: 'memories_access',
      targetRecordingId: 'recording-id',
    });
    productsRepository.findOne.mockResolvedValue({
      id: 'memories_access',
      feature: ProductFeature.MEMORIES,
    });
    const payload = JSON.stringify({
      id: 'payment-event-2',
      type: PaymentEventType.PAYMENT_SUCCEEDED,
      orderId: 'order-id',
      paymentId: 'provider-payment-id',
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', 'local-payment-webhook-secret')
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    await expect(
      service.handleLocalWebhook({
        payload,
        headers: {
          'x-talkto-payment-event-id': 'payment-event-2',
          'x-talkto-payment-timestamp': String(timestamp),
          'x-talkto-payment-signature': signature,
        },
      }),
    ).resolves.toMatchObject({
      processed: true,
      entitlementId: 'entitlement-id',
      analysisJobId: 'analysis-job-id',
    });

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
});
