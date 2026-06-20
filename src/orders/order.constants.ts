export const PaymentProvider = {
  LOCAL: 'local',
} as const;

export type PaymentProvider =
  (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const PaymentProviderValues = [PaymentProvider.LOCAL] as const;

export const OrderPaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;

export type OrderPaymentStatus =
  (typeof OrderPaymentStatus)[keyof typeof OrderPaymentStatus];

export const OrderPaymentStatusValues = [
  OrderPaymentStatus.PENDING,
  OrderPaymentStatus.PAID,
  OrderPaymentStatus.FAILED,
  OrderPaymentStatus.CANCELED,
] as const;
