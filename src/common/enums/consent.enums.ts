export const ConsentFeature = {
  ARCHIVE: 'archive',
  MEMORIES: 'memories',
  VOICE_PERSONA: 'voice_persona',
} as const;

export type ConsentFeature = (typeof ConsentFeature)[keyof typeof ConsentFeature];

export const CONSENT_FEATURES = Object.values(ConsentFeature);

export const ConsentStatus = {
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'expired',
} as const;

export type ConsentStatus = (typeof ConsentStatus)[keyof typeof ConsentStatus];

export const CONSENT_STATUSES = Object.values(ConsentStatus);

export const ConsentType = {
  PRIVACY_COLLECTION: 'privacy_collection',
  AUDIO_STORAGE_SERVICE: 'audio_storage_service',
  BIOMETRIC_VOICE_PROCESSING: 'biometric_voice_processing',
  AI_ANALYSIS_SERVICE: 'ai_analysis_service',
  OVERSEAS_TRANSFER_LLM_PROVIDER: 'overseas_transfer_llm_provider',
  OVERSEAS_TRANSFER_VOICE_PROVIDER: 'overseas_transfer_voice_provider',
  POSTHUMOUS_PERSONA_CREATION: 'posthumous_persona_creation',
  FAMILY_RECONSENT_POSTHUMOUS: 'family_reconsent_posthumous',
  MARKETING_OPTIONAL: 'marketing_optional',
} as const;

export type ConsentType = (typeof ConsentType)[keyof typeof ConsentType];

export const CONSENT_TYPES = Object.values(ConsentType);
