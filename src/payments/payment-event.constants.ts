export const PaymentEventType = {
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
} as const;

export type PaymentEventType =
  (typeof PaymentEventType)[keyof typeof PaymentEventType];

export const PaymentEventTypeValues = [
  PaymentEventType.PAYMENT_SUCCEEDED,
  PaymentEventType.PAYMENT_FAILED,
] as const;

export const EntitlementStatus = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
} as const;

export type EntitlementStatus =
  (typeof EntitlementStatus)[keyof typeof EntitlementStatus];

export const EntitlementStatusValues = [
  EntitlementStatus.ACTIVE,
  EntitlementStatus.REVOKED,
] as const;
