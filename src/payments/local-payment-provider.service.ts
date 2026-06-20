import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from '../orders/order.entity';
import { PaymentEventType } from './payment-event.constants';

export interface LocalCheckoutSession {
  readonly provider: 'local';
  readonly checkoutId: string;
  readonly paymentUrl: string;
}

export interface LocalWebhookFixture {
  readonly headers: Record<string, string>;
  readonly payload: Record<string, unknown>;
}

@Injectable()
export class LocalPaymentProviderService {
  constructor(private readonly configService: ConfigService) {}

  createCheckoutSession(order: Order): LocalCheckoutSession {
    const checkoutId = `local_checkout_${order.id}`;

    return {
      provider: 'local',
      checkoutId,
      paymentUrl: `/api/v1/payments/local/checkout/${checkoutId}`,
    };
  }

  buildPaymentSucceededWebhook(order: Order, nowSeconds: number): LocalWebhookFixture {
    const eventId = `local_evt_${order.id}`;
    const payload = {
      id: eventId,
      type: PaymentEventType.PAYMENT_SUCCEEDED,
      orderId: order.id,
      paymentId: `local_pay_${order.id}`,
    };
    const serializedPayload = JSON.stringify(payload);

    return {
      payload,
      headers: {
        'x-talkto-payment-event-id': eventId,
        'x-talkto-payment-timestamp': String(nowSeconds),
        'x-talkto-payment-signature': this.signPayload(
          serializedPayload,
          nowSeconds,
        ),
      },
    };
  }

  signPayload(payload: string, timestampSeconds: number): string {
    return createHmac('sha256', this.getWebhookSecret())
      .update(`${timestampSeconds}.${payload}`)
      .digest('hex');
  }

  private getWebhookSecret(): string {
    return this.configService.get<string>(
      'PAYMENT_WEBHOOK_SECRET',
      'local-payment-webhook-secret',
    );
  }
}
