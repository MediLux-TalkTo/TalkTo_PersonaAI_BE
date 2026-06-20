import { Test } from '@nestjs/testing';
import { success } from '../common/utils/api-response';
import { OrderPaymentStatus, PaymentProvider } from './order.constants';
import { Order } from './order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  const ordersService = {
    createOrder: jest.fn(),
  };
  let ordersController: OrdersController;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: ordersService,
        },
      ],
    }).compile();

    ordersController = moduleRef.get(OrdersController);
  });

  it('creates orders for the authenticated user instead of body owner input', async () => {
    const currentUser = { userId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb' };
    const order = buildOrder(currentUser.userId);
    const checkout = {
      provider: PaymentProvider.LOCAL,
      checkoutId: 'local_checkout_order-1',
      paymentUrl: '/api/v1/payments/local/checkout/local_checkout_order-1',
    };
    const serviceResponse = { order, checkout };
    const createOrderDto = {
      productId: 'voice_persona_build',
      ownerUserId: 'body-owner-should-not-be-trusted',
    };
    ordersService.createOrder.mockResolvedValue(serviceResponse);

    await expect(
      ordersController.createOrder(createOrderDto, currentUser),
    ).resolves.toEqual(success(serviceResponse));

    expect(ordersService.createOrder).toHaveBeenCalledWith({
      ownerUserId: currentUser.userId,
      productId: 'voice_persona_build',
    });
  });
});

function buildOrder(ownerUserId: string): Order {
  const order = new Order();
  order.id = 'order-1';
  order.ownerUserId = ownerUserId;
  order.productId = 'voice_persona_build';
  order.paymentProvider = PaymentProvider.LOCAL;
  order.paymentStatus = OrderPaymentStatus.PENDING;
  order.amountCents = 29900;
  order.currency = 'USD';
  order.createdAt = new Date('2026-06-17T00:00:00.000Z');
  order.updatedAt = new Date('2026-06-17T00:00:00.000Z');
  return order;
}
