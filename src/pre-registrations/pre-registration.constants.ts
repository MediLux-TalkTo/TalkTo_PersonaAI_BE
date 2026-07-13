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

export const SurveyFirstSituation = {
  PRESERVE_LIVING_FAMILY_VOICE: 'preserve_living_family_voice',
  REVISIT_DECEASED_FAMILY_VOICE: 'revisit_deceased_family_voice',
  LACK_DECEASED_FAMILY_RECORDS: 'lack_deceased_family_records',
  LEAVE_MY_VOICE_AND_STORY: 'leave_my_voice_and_story',
  CURIOUS_ABOUT_SERVICE: 'curious_about_service',
} as const;

export type SurveyFirstSituation =
  (typeof SurveyFirstSituation)[keyof typeof SurveyFirstSituation];

export const SurveyRecordingAvailability = {
  MORE_THAN_10: 'more_than_10',
  BETWEEN_3_AND_9: 'between_3_and_9',
  BETWEEN_1_AND_2: 'between_1_and_2',
  LIKELY_BUT_NOT_FOUND: 'likely_but_not_found',
  NO_AUDIO_BUT_OTHER_RECORDS: 'no_audio_but_other_records',
  NONE: 'none',
} as const;

export type SurveyRecordingAvailability =
  (typeof SurveyRecordingAvailability)[keyof typeof SurveyRecordingAvailability];

export const SurveyRecordSearchExperience = {
  HARD_TO_FIND: 'hard_to_find',
  HARD_TO_ORGANIZE: 'hard_to_organize',
  WANTED_TO_RELISTEN_BUT_DID_NOT_SEARCH: 'wanted_to_relisten_but_did_not_search',
  NEVER_THOUGHT_TO_ORGANIZE: 'never_thought_to_organize',
  NO_INCONVENIENCE: 'no_inconvenience',
  UNSURE: 'unsure',
} as const;

export type SurveyRecordSearchExperience =
  (typeof SurveyRecordSearchExperience)[keyof typeof SurveyRecordSearchExperience];

export const SurveyVoiceLossRegret = {
  NOT_AT_ALL: 1,
  SLIGHTLY: 2,
  NEUTRAL: 3,
  QUITE: 4,
  VERY: 5,
} as const;

export type SurveyVoiceLossRegret =
  (typeof SurveyVoiceLossRegret)[keyof typeof SurveyVoiceLossRegret];

export const SurveyDesiredFeature = {
  ARCHIVE_RECORDINGS: 'archive_recordings',
  ORGANIZE_RECORDS: 'organize_records',
  SEARCH_MEMORIES: 'search_memories',
  SHARE_WITH_FAMILY: 'share_with_family',
  VOICE_PERSONA: 'voice_persona',
  NO_SPECIAL_NEED: 'no_special_need',
} as const;

export type SurveyDesiredFeature =
  (typeof SurveyDesiredFeature)[keyof typeof SurveyDesiredFeature];

export const SurveyVoicePersonaFeeling = {
  EAGER: 'eager',
  CURIOUS_CAUTIOUS: 'curious_cautious',
  ARCHIVE_SEARCH_ONLY: 'archive_search_only',
  ETHICALLY_UNCOMFORTABLE: 'ethically_uncomfortable',
  SCARY_OR_AVERSIVE: 'scary_or_aversive',
  UNSURE: 'unsure',
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
  readonly firstSituation: SurveyFirstSituation;
  readonly recordingAvailability: SurveyRecordingAvailability;
  readonly recordSearchExperience: SurveyRecordSearchExperience;
  readonly voiceLossRegret: SurveyVoiceLossRegret;
  readonly desiredFeatures: readonly SurveyDesiredFeature[];
  readonly voicePersonaFeeling: SurveyVoicePersonaFeeling;
  readonly concerns: readonly SurveyConcern[];
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
