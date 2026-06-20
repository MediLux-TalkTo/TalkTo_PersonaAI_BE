import { createHmac } from 'node:crypto';
import {
  PaymentWebhookVerificationError,
  verifyLocalPaymentWebhook,
} from './payment-webhook-verifier';

describe('verifyLocalPaymentWebhook', () => {
  const secret = 'test-webhook-secret';
  const payload = JSON.stringify({
    id: 'evt_test_1',
    type: 'payment.succeeded',
    orderId: '90f7b52f-6b5a-4dd2-8f32-efce2a6f86c2',
    paymentId: 'pay_test_1',
  });
  const timestamp = 1_800_000_000;

  function sign(body: string, signedAt: number): string {
    return createHmac('sha256', secret)
      .update(`${signedAt}.${body}`)
      .digest('hex');
  }

  it('accepts a valid signed webhook when timestamp is inside tolerance', () => {
    const event = verifyLocalPaymentWebhook({
      headers: {
        'x-talkto-payment-event-id': 'evt_test_1',
        'x-talkto-payment-signature': sign(payload, timestamp),
        'x-talkto-payment-timestamp': String(timestamp),
      },
      payload,
      secret,
      toleranceSeconds: 300,
      nowSeconds: timestamp + 120,
    });

    expect(event).toMatchObject({
      provider: 'local',
      providerEventId: 'evt_test_1',
      type: 'payment.succeeded',
      orderId: '90f7b52f-6b5a-4dd2-8f32-efce2a6f86c2',
      paymentId: 'pay_test_1',
    });
  });

  it('rejects unsigned webhooks before parsing provider event data', () => {
    expect(() =>
      verifyLocalPaymentWebhook({
        headers: {
          'x-talkto-payment-event-id': 'evt_test_1',
          'x-talkto-payment-timestamp': String(timestamp),
        },
        payload,
        secret,
        toleranceSeconds: 300,
        nowSeconds: timestamp,
      }),
    ).toThrow(PaymentWebhookVerificationError);
  });

  it('rejects invalid signatures', () => {
    expect(() =>
      verifyLocalPaymentWebhook({
        headers: {
          'x-talkto-payment-event-id': 'evt_test_1',
          'x-talkto-payment-signature': 'bad-signature',
          'x-talkto-payment-timestamp': String(timestamp),
        },
        payload,
        secret,
        toleranceSeconds: 300,
        nowSeconds: timestamp,
      }),
    ).toThrow(/Invalid payment webhook signature/);
  });

  it('rejects timestamp-skewed webhooks', () => {
    expect(() =>
      verifyLocalPaymentWebhook({
        headers: {
          'x-talkto-payment-event-id': 'evt_test_1',
          'x-talkto-payment-signature': sign(payload, timestamp),
          'x-talkto-payment-timestamp': String(timestamp),
        },
        payload,
        secret,
        toleranceSeconds: 300,
        nowSeconds: timestamp + 301,
      }),
    ).toThrow(/timestamp is outside tolerance/);
  });
});
