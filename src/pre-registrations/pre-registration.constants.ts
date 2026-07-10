export const PreRegistrationParticipationType = {
  EARLY_ACCESS: 'early_access',
  SURVEY_10: 'survey_10',
  INTERVIEW_20: 'interview_20',
} as const;

export type PreRegistrationParticipationType =
  (typeof PreRegistrationParticipationType)[keyof typeof PreRegistrationParticipationType];

export const PreRegistrationReason = {
  PRESERVE_VOICE_AND_MEMORIES: 'preserve_voice_and_memories',
  PRESERVE_FAMILY_RECORDS: 'preserve_family_records',
  VOICE_PERSONA_INTEREST: 'voice_persona_interest',
  OTHER: 'other',
} as const;

export type PreRegistrationReason =
  (typeof PreRegistrationReason)[keyof typeof PreRegistrationReason];

export const PreRegistrationContactType = {
  EMAIL: 'email',
  PHONE: 'phone',
} as const;

export type PreRegistrationContactType =
  (typeof PreRegistrationContactType)[keyof typeof PreRegistrationContactType];

export const PreRegistrationStatus = {
  RECEIVED: 'received',
  CONTACTED: 'contacted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  CLOSED: 'closed',
} as const;

export type PreRegistrationStatus =
  (typeof PreRegistrationStatus)[keyof typeof PreRegistrationStatus];

export const PreRegistrationBenefitStatus = {
  NOT_APPLICABLE: 'not_applicable',
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
} as const;

export type PreRegistrationBenefitStatus =
  (typeof PreRegistrationBenefitStatus)[keyof typeof PreRegistrationBenefitStatus];

export const SurveyRecordingAvailability = {
  HAS_RECORDING: 'has_recording',
  WANTS_TO_COLLECT: 'wants_to_collect',
} as const;

export type SurveyRecordingAvailability =
  (typeof SurveyRecordingAvailability)[keyof typeof SurveyRecordingAvailability];

export const SurveyInterest = {
  ARCHIVE_RECORDINGS: 'archive_recordings',
  SEARCH_AND_RELISTEN: 'search_and_relisten',
  AI_SUMMARY: 'ai_summary',
  VOICE_PERSONA: 'voice_persona',
} as const;

export type SurveyInterest = (typeof SurveyInterest)[keyof typeof SurveyInterest];

export const SurveyVoicePersonaFeeling = {
  EAGER: 'eager',
  CURIOUS_CAUTIOUS: 'curious_cautious',
  ORIGINAL_VOICE_ONLY: 'original_voice_only',
  UNCOMFORTABLE: 'uncomfortable',
} as const;

export type SurveyVoicePersonaFeeling =
  (typeof SurveyVoicePersonaFeeling)[keyof typeof SurveyVoicePersonaFeeling];

export const SurveyConcern = {
  PRIVACY_STORAGE: 'privacy_storage',
  DIFFERENT_WORDS: 'different_words',
  EMOTIONAL_DISTRESS: 'emotional_distress',
  PRICE: 'price',
} as const;

export type SurveyConcern = (typeof SurveyConcern)[keyof typeof SurveyConcern];

export const InterviewTimeSlot = {
  WEEKDAY_DAYTIME: 'weekday_daytime',
  WEEKDAY_EVENING: 'weekday_evening',
  WEEKEND_DAYTIME: 'weekend_daytime',
  WEEKEND_EVENING: 'weekend_evening',
} as const;

export type InterviewTimeSlot =
  (typeof InterviewTimeSlot)[keyof typeof InterviewTimeSlot];

export const InterviewContactMethod = {
  PHONE: 'phone',
  KAKAO: 'kakao',
  EMAIL: 'email',
  VIDEO: 'video',
} as const;

export type InterviewContactMethod =
  (typeof InterviewContactMethod)[keyof typeof InterviewContactMethod];

export const InterviewRecordingDuration = {
  NONE: 'none',
  UNDER_10_MIN: 'under_10_min',
  BETWEEN_10_AND_30_MIN: 'between_10_and_30_min',
  OVER_30_MIN: 'over_30_min',
} as const;

export type InterviewRecordingDuration =
  (typeof InterviewRecordingDuration)[keyof typeof InterviewRecordingDuration];

export type PreRegistrationSurvey = {
  readonly hasRecording: SurveyRecordingAvailability;
  readonly interests: readonly SurveyInterest[];
  readonly voicePersonaFeeling: SurveyVoicePersonaFeeling;
  readonly concerns: readonly SurveyConcern[];
  readonly usageSituation: string | null;
};

export type PreRegistrationInterview = {
  readonly preferredTimeSlots: readonly InterviewTimeSlot[];
  readonly preferredContactMethod: InterviewContactMethod;
  readonly recordingDuration: InterviewRecordingDuration;
};

export type PreRegistrationUtm = {
  readonly source?: string;
  readonly medium?: string;
  readonly campaign?: string;
};
