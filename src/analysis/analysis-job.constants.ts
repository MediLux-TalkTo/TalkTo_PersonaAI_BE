export const AnalysisJobStatus = {
  QUEUED: 'queued',
  LEASED: 'leased',
  PREPROCESSING: 'preprocessing',
  STT_PROCESSING: 'stt_processing',
  REDACTION_PENDING: 'redaction_pending',
  SEGMENTING: 'segmenting',
  EMBEDDING: 'embedding',
  INDEXING: 'indexing',
  COMPLETED: 'completed',
  FAILED_RETRYABLE: 'failed_retryable',
  FAILED_TERMINAL: 'failed_terminal',
  BLOCKED_CONSENT_WITHDRAWN: 'blocked_consent_withdrawn',
  CANCELLED: 'cancelled',
} as const;

export type AnalysisJobStatus =
  (typeof AnalysisJobStatus)[keyof typeof AnalysisJobStatus];

export const analysisJobStatusValues = Object.values(AnalysisJobStatus);
