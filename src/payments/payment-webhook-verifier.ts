import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentProvider } from '../orders/order.constants';
import { PaymentEventType } from './payment-event.constants';

export class PaymentWebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentWebhookVerificationError';
  }
}

export interface VerifiedPaymentEvent {
  readonly provider: PaymentProvider;
  readonly providerEventId: string;
  readonly type: PaymentEventType;
  readonly orderId?: string;
  readonly paymentId?: string;
  readonly payload: Record<string, unknown>;
}

export interface VerifyLocalPaymentWebhookInput {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly payload: string;
  readonly secret: string;
  readonly toleranceSeconds: number;
  readonly nowSeconds?: number;
}

export function verifyLocalPaymentWebhook(
  input: VerifyLocalPaymentWebhookInput,
): VerifiedPaymentEvent {
  const eventId = readRequiredHeader(
    input.headers,
    'x-talkto-payment-event-id',
  );
  const timestampHeader = readRequiredHeader(
    input.headers,
    'x-talkto-payment-timestamp',
  );
  const signature = readRequiredHeader(
    input.headers,
    'x-talkto-payment-signature',
  );
  const timestamp = Number(timestampHeader);

  if (!Number.isInteger(timestamp)) {
    throw new PaymentWebhookVerificationError(
      'Payment webhook timestamp must be an integer.',
    );
  }

  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > input.toleranceSeconds) {
    throw new PaymentWebhookVerificationError(
      'Payment webhook timestamp is outside tolerance.',
    );
  }

  const expectedSignature = createHmac('sha256', input.secret)
    .update(`${timestamp}.${input.payload}`)
    .digest('hex');

  if (!hasValidSignature(signature, expectedSignature)) {
    throw new PaymentWebhookVerificationError(
      'Invalid payment webhook signature.',
    );
  }

  const parsedPayload = parsePayload(input.payload);
  const parsedEventId = readRequiredString(parsedPayload, 'id');

  if (parsedEventId !== eventId) {
    throw new PaymentWebhookVerificationError(
      'Payment webhook event id mismatch.',
    );
  }

  return {
    provider: PaymentProvider.LOCAL,
    providerEventId: parsedEventId,
    type: readPaymentEventType(parsedPayload),
    orderId: readOptionalString(parsedPayload, 'orderId'),
    paymentId: readOptionalString(parsedPayload, 'paymentId'),
    payload: parsedPayload,
  };
}

function readRequiredHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string {
  const value = headers[name] ?? headers[name.toLowerCase()];
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized) {
    throw new PaymentWebhookVerificationError(
      `Missing payment webhook header: ${name}.`,
    );
  }

  return normalized;
}

function hasValidSignature(received: string, expected: string): boolean {
  if (!/^[0-9a-f]+$/i.test(received)) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function parsePayload(payload: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new PaymentWebhookVerificationError(
        'Payment webhook payload must be valid JSON.',
      );
    }
    throw error;
  }

  if (!isRecord(parsed)) {
    throw new PaymentWebhookVerificationError(
      'Payment webhook payload must be an object.',
    );
  }

  return parsed;
}

function readPaymentEventType(payload: Record<string, unknown>): PaymentEventType {
  const value = readRequiredString(payload, 'type');

  switch (value) {
    case PaymentEventType.PAYMENT_SUCCEEDED:
      return PaymentEventType.PAYMENT_SUCCEEDED;
    case PaymentEventType.PAYMENT_FAILED:
      return PaymentEventType.PAYMENT_FAILED;
    default:
      throw new PaymentWebhookVerificationError(
        'Unsupported payment webhook event type.',
      );
  }
}

function readRequiredString(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = payload[key];

  if (typeof value !== 'string' || value.length === 0) {
    throw new PaymentWebhookVerificationError(
      `Payment webhook field ${key} is required.`,
    );
  }

  return value;
}

function readOptionalString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string' || value.length === 0) {
    throw new PaymentWebhookVerificationError(
      `Payment webhook field ${key} must be a non-empty string.`,
    );
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
