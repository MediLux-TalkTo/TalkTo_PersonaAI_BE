import { ConflictException } from '@nestjs/common';
import { AnalysisJobStatus } from './analysis-job.constants';
import {
  assertAnalysisJobTransition,
  isAnalysisJobActive,
  timedOutStatusForJob,
} from './analysis-job-transitions';

describe('analysis job state machine', () => {
  it('allows the paid analysis pipeline sequence and rejects rollback from completed', () => {
    expect(() =>
      assertAnalysisJobTransition(AnalysisJobStatus.QUEUED, AnalysisJobStatus.LEASED),
    ).not.toThrow();
    expect(() =>
      assertAnalysisJobTransition(
        AnalysisJobStatus.STT_PROCESSING,
        AnalysisJobStatus.REDACTION_PENDING,
      ),
    ).not.toThrow();
    expect(() =>
      assertAnalysisJobTransition(
        AnalysisJobStatus.EMBEDDING,
        AnalysisJobStatus.COMPLETED,
      ),
    ).not.toThrow();

    expect(() =>
      assertAnalysisJobTransition(AnalysisJobStatus.COMPLETED, AnalysisJobStatus.QUEUED),
    ).toThrow(ConflictException);
  });

  it('treats retryable failures as active until retried or terminalized', () => {
    expect(isAnalysisJobActive(AnalysisJobStatus.QUEUED)).toBe(true);
    expect(isAnalysisJobActive(AnalysisJobStatus.FAILED_RETRYABLE)).toBe(true);
    expect(isAnalysisJobActive(AnalysisJobStatus.COMPLETED)).toBe(false);
    expect(isAnalysisJobActive(AnalysisJobStatus.BLOCKED_CONSENT_WITHDRAWN)).toBe(false);
  });

  it('maps expired leases to retryable or terminal failure based on retry budget', () => {
    expect(timedOutStatusForJob({ retryCount: 1, maxRetries: 3 })).toBe(
      AnalysisJobStatus.FAILED_RETRYABLE,
    );
    expect(timedOutStatusForJob({ retryCount: 3, maxRetries: 3 })).toBe(
      AnalysisJobStatus.FAILED_TERMINAL,
    );
  });
});
