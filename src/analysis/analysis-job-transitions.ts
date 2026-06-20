import { ConflictException } from '@nestjs/common';
import { AnalysisJobStatus } from './analysis-job.constants';

export const ACTIVE_ANALYSIS_JOB_STATUSES = [
  AnalysisJobStatus.QUEUED,
  AnalysisJobStatus.LEASED,
  AnalysisJobStatus.PREPROCESSING,
  AnalysisJobStatus.STT_PROCESSING,
  AnalysisJobStatus.REDACTION_PENDING,
  AnalysisJobStatus.SEGMENTING,
  AnalysisJobStatus.EMBEDDING,
  AnalysisJobStatus.INDEXING,
  AnalysisJobStatus.FAILED_RETRYABLE,
] as const;

export const LEASED_ANALYSIS_JOB_STATUSES = [
  AnalysisJobStatus.LEASED,
  AnalysisJobStatus.PREPROCESSING,
  AnalysisJobStatus.STT_PROCESSING,
  AnalysisJobStatus.REDACTION_PENDING,
  AnalysisJobStatus.SEGMENTING,
  AnalysisJobStatus.EMBEDDING,
  AnalysisJobStatus.INDEXING,
] as const;

const ALLOWED_TRANSITIONS = {
  [AnalysisJobStatus.QUEUED]: [
    AnalysisJobStatus.LEASED,
    AnalysisJobStatus.CANCELLED,
    AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
  ],
  [AnalysisJobStatus.LEASED]: [
    AnalysisJobStatus.PREPROCESSING,
    AnalysisJobStatus.FAILED_RETRYABLE,
    AnalysisJobStatus.FAILED_TERMINAL,
    AnalysisJobStatus.CANCELLED,
    AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
  ],
  [AnalysisJobStatus.PREPROCESSING]: [
    AnalysisJobStatus.STT_PROCESSING,
    AnalysisJobStatus.FAILED_RETRYABLE,
    AnalysisJobStatus.FAILED_TERMINAL,
    AnalysisJobStatus.CANCELLED,
    AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
  ],
  [AnalysisJobStatus.STT_PROCESSING]: [
    AnalysisJobStatus.REDACTION_PENDING,
    AnalysisJobStatus.FAILED_RETRYABLE,
    AnalysisJobStatus.FAILED_TERMINAL,
    AnalysisJobStatus.CANCELLED,
    AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
  ],
  [AnalysisJobStatus.REDACTION_PENDING]: [
    AnalysisJobStatus.SEGMENTING,
    AnalysisJobStatus.FAILED_RETRYABLE,
    AnalysisJobStatus.FAILED_TERMINAL,
    AnalysisJobStatus.CANCELLED,
    AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
  ],
  [AnalysisJobStatus.SEGMENTING]: [
    AnalysisJobStatus.EMBEDDING,
    AnalysisJobStatus.INDEXING,
    AnalysisJobStatus.FAILED_RETRYABLE,
    AnalysisJobStatus.FAILED_TERMINAL,
    AnalysisJobStatus.CANCELLED,
    AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
  ],
  [AnalysisJobStatus.EMBEDDING]: [
    AnalysisJobStatus.INDEXING,
    AnalysisJobStatus.COMPLETED,
    AnalysisJobStatus.FAILED_RETRYABLE,
    AnalysisJobStatus.FAILED_TERMINAL,
    AnalysisJobStatus.CANCELLED,
    AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
  ],
  [AnalysisJobStatus.INDEXING]: [
    AnalysisJobStatus.COMPLETED,
    AnalysisJobStatus.FAILED_RETRYABLE,
    AnalysisJobStatus.FAILED_TERMINAL,
    AnalysisJobStatus.CANCELLED,
    AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
  ],
  [AnalysisJobStatus.FAILED_RETRYABLE]: [
    AnalysisJobStatus.QUEUED,
    AnalysisJobStatus.FAILED_TERMINAL,
    AnalysisJobStatus.CANCELLED,
    AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN,
  ],
  [AnalysisJobStatus.COMPLETED]: [],
  [AnalysisJobStatus.FAILED_TERMINAL]: [],
  [AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN]: [],
  [AnalysisJobStatus.CANCELLED]: [],
} as const satisfies Record<AnalysisJobStatus, readonly AnalysisJobStatus[]>;

export function isAnalysisJobActive(status: AnalysisJobStatus): boolean {
  return ACTIVE_ANALYSIS_JOB_STATUSES.some((activeStatus) => activeStatus === status);
}

export function assertAnalysisJobTransition(
  from: AnalysisJobStatus,
  to: AnalysisJobStatus,
): void {
  if (ALLOWED_TRANSITIONS[from].some((allowedStatus) => allowedStatus === to)) {
    return;
  }

  throw new ConflictException({
    code: 'invalid_analysis_job_transition',
    message: 'Analysis job status transition is not allowed.',
    from,
    to,
  });
}

export function timedOutStatusForJob(input: {
  readonly retryCount: number;
  readonly maxRetries: number;
}): AnalysisJobStatus {
  return input.retryCount < input.maxRetries
    ? AnalysisJobStatus.FAILED_RETRYABLE
    : AnalysisJobStatus.FAILED_TERMINAL;
}
