export const DataDeletionScope = {
  ACCOUNT: 'account',
  SUBJECT: 'subject',
  RECORDING: 'recording',
} as const;

export type DataDeletionScope =
  (typeof DataDeletionScope)[keyof typeof DataDeletionScope];

export const DataDeletionRequestStatus = {
  REQUESTED: 'requested',
  IN_REVIEW: 'in_review',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

export type DataDeletionRequestStatus =
  (typeof DataDeletionRequestStatus)[keyof typeof DataDeletionRequestStatus];

export const ProviderDeletionStatus = {
  PENDING_MANUAL: 'pending_manual',
  REQUESTED: 'requested',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ProviderDeletionStatus =
  (typeof ProviderDeletionStatus)[keyof typeof ProviderDeletionStatus];

export const DATA_DELETION_CONFIRMATION = 'DELETE MY DATA';
