export const VoicePersonaApplicationStatus = {
  DRAFT: 'draft',
  LOCKED_UNTIL_REQUIREMENTS: 'locked_until_requirements',
  READY_FOR_ADMIN_REVIEW: 'ready_for_admin_review',
  BUILD_PENDING: 'build_pending',
  READY: 'ready',
} as const;

export type VoicePersonaApplicationStatus =
  (typeof VoicePersonaApplicationStatus)[keyof typeof VoicePersonaApplicationStatus];

export const VoicePersonaReviewStatus = {
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type VoicePersonaReviewStatus =
  (typeof VoicePersonaReviewStatus)[keyof typeof VoicePersonaReviewStatus];

export const VoicePersonaBuildStatus = {
  LOCKED_UNTIL_REQUIREMENTS: 'locked_until_requirements',
  PENDING_ADMIN_REVIEW: 'pending_admin_review',
  PENDING_MANUAL_PROVIDER_ASSET: 'pending_manual_provider_asset',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export type VoicePersonaBuildStatus =
  (typeof VoicePersonaBuildStatus)[keyof typeof VoicePersonaBuildStatus];

export const REQUIRED_INTAKE_SECTION_COUNT = 8;
