import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ConsentFeature, ConsentType } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { LocalPaymentProviderService } from '../payments/local-payment-provider.service';
import { ProductFeature } from '../products/product.constants';
import { Product } from '../products/product.entity';
import { ProductsService } from '../products/products.service';
import { OrderPaymentStatus, PaymentProvider } from './order.constants';
import { Order } from './order.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const ordersRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const productsService = {
    findActiveById: jest.fn(),
  };
  const localPaymentProvider = {
    createCheckoutSession: jest.fn(),
  };
  const consentsService = {
    assertRequiredConsents: jest.fn(),
  };
  const appEventsService = {
    emit: jest.fn(),
  };
  let ordersService: OrdersService;

  beforeEach(async () => {
    jest.resetAllMocks();
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    appEventsService.emit.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: ordersRepository,
        },
        {
          provide: ProductsService,
          useValue: productsService,
        },
        {
          provide: LocalPaymentProviderService,
          useValue: localPaymentProvider,
        },
        {
          provide: ConsentsService,
          useValue: consentsService,
        },
        {
          provide: AppEventsService,
          useValue: appEventsService,
        },
      ],
    }).compile();

    ordersService = moduleRef.get(OrdersService);
  });

  it('creates a pending local checkout order from the selected product', async () => {
    const product = buildProduct();
    const order = buildOrder(product);
    const checkout = {
      provider: PaymentProvider.LOCAL,
      checkoutId: 'local_checkout_order-1',
      paymentUrl: '/api/v1/payments/local/checkout/local_checkout_order-1',
    };
    productsService.findActiveById.mockResolvedValue(product);
    ordersRepository.create.mockReturnValue(order);
    ordersRepository.save.mockResolvedValue(order);
    localPaymentProvider.createCheckoutSession.mockReturnValue(checkout);

    await expect(
      ordersService.createOrder({
        ownerUserId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb',
        productId: product.id,
      }),
    ).resolves.toEqual({ order, checkout });

    expect(ordersRepository.create).toHaveBeenCalledWith({
      ownerUserId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb',
      productId: product.id,
      paymentProvider: PaymentProvider.LOCAL,
      paymentStatus: OrderPaymentStatus.PENDING,
      amountCents: product.amountCents,
      currency: product.currency,
      targetRecordingId: null,
    });
    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'd73ea1d4-7cdb-47fa-9213-2770585175bb',
      ConsentFeature.VOICE_PERSONA,
    );
    expect(order.providerCheckoutId).toBe(checkout.checkoutId);
    expect(appEventsService.emit).toHaveBeenCalledWith({
      userId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb',
      name: 'order.created',
      orderId: 'order-1',
      payload: {
        productId: product.id,
        productFeature: product.feature,
        paymentProvider: PaymentProvider.LOCAL,
        paymentStatus: OrderPaymentStatus.PENDING,
        amountCents: product.amountCents,
        currency: product.currency,
        hasTargetRecording: false,
      },
    });
    expect(JSON.stringify(appEventsService.emit.mock.calls[0][0])).not.toContain(
      checkout.paymentUrl,
    );
  });

  it('blocks Memories orders when paid feature consent is missing', async () => {
    const product = buildProduct(ProductFeature.MEMORIES);
    productsService.findActiveById.mockResolvedValue(product);
    consentsService.assertRequiredConsents.mockRejectedValue(
      new ForbiddenException({
        code: 'requires_consent',
        message: 'Memories requires consent.',
        missing_consent_types: [ConsentType.AI_ANALYSIS_SERVICE],
      }),
    );

    await expect(
      ordersService.createOrder({
        ownerUserId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb',
        productId: product.id,
        targetRecordingId: 'recording-id',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'requires_consent',
        missing_consent_types: [ConsentType.AI_ANALYSIS_SERVICE],
      }),
    });

    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'd73ea1d4-7cdb-47fa-9213-2770585175bb',
      ConsentFeature.MEMORIES,
    );
    expect(ordersRepository.create).not.toHaveBeenCalled();
    expect(localPaymentProvider.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('requires and stores a target recording for paid Memories orders', async () => {
    const product = buildProduct(ProductFeature.MEMORIES);
    const order = buildOrder(product);
    order.targetRecordingId = 'recording-id';
    const checkout = {
      provider: PaymentProvider.LOCAL,
      checkoutId: 'local_checkout_order-1',
      paymentUrl: '/api/v1/payments/local/checkout/local_checkout_order-1',
    };
    productsService.findActiveById.mockResolvedValue(product);
    ordersRepository.create.mockReturnValue(order);
    ordersRepository.save.mockResolvedValue(order);
    localPaymentProvider.createCheckoutSession.mockReturnValue(checkout);

    await expect(
      ordersService.createOrder({
        ownerUserId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb',
        productId: product.id,
        targetRecordingId: 'recording-id',
      }),
    ).resolves.toEqual({ order, checkout });

    expect(ordersRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      productId: product.id,
      targetRecordingId: 'recording-id',
    }));
    expect(appEventsService.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          hasTargetRecording: true,
        }),
      }),
    );
  });
});

function buildProduct(feature: ProductFeature = ProductFeature.VOICE_PERSONA): Product {
  const product = new Product();
  product.id =
    feature === ProductFeature.MEMORIES ? 'memories_access' : 'voice_persona_build';
  product.code = product.id;
  product.feature = feature;
  product.displayName = 'Voice Persona';
  product.description = 'Unlock Voice Persona';
  product.amountCents = 29900;
  product.currency = 'USD';
  product.active = true;
  product.createdAt = new Date('2026-06-17T00:00:00.000Z');
  product.updatedAt = new Date('2026-06-17T00:00:00.000Z');
  return product;
}

function buildOrder(product: Product): Order {
  const order = new Order();
  order.id = 'order-1';
  order.ownerUserId = 'd73ea1d4-7cdb-47fa-9213-2770585175bb';
  order.productId = product.id;
  order.paymentProvider = PaymentProvider.LOCAL;
  order.paymentStatus = OrderPaymentStatus.PENDING;
  order.targetRecordingId = null;
  order.amountCents = product.amountCents;
  order.currency = product.currency;
  order.createdAt = new Date('2026-06-17T00:00:00.000Z');
  order.updatedAt = new Date('2026-06-17T00:00:00.000Z');
  return order;
}
