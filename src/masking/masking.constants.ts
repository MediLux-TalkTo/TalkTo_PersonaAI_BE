export const MaskingStatus = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  NOT_REQUIRED: 'not_required',
} as const;

export type MaskingStatus = (typeof MaskingStatus)[keyof typeof MaskingStatus];

export const MaskingSpanKind = {
  EMAIL: 'email',
  PHONE: 'phone',
  NATIONAL_ID: 'national_id',
  TOKEN: 'token',
  SIGNED_URL: 'signed_url',
  PROMPT_INJECTION: 'prompt_injection',
} as const;

export type MaskingSpanKind =
  (typeof MaskingSpanKind)[keyof typeof MaskingSpanKind];

export const RedactionSourceType = {
  TRANSCRIPT: 'transcript',
  TRANSCRIPT_SEGMENT: 'transcript_segment',
  MEMORY_SEGMENT: 'memory_segment',
  PROVIDER_PAYLOAD: 'provider_payload',
} as const;

export type RedactionSourceType =
  (typeof RedactionSourceType)[keyof typeof RedactionSourceType];
