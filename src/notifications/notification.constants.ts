export const NotificationType = {
  ANALYSIS_COMPLETED: 'analysis_completed',
  ANALYSIS_FAILED: 'analysis_failed',
  PERSONA_DOCUMENT_STATUS: 'persona_document_status',
  PERSONA_REVIEW_STATUS: 'persona_review_status',
  PERSONA_BUILD_STATUS: 'persona_build_status',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];
