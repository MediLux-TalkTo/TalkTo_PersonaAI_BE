export enum SubjectLifeStatus {
  LIVING = 'LIVING',
  DECEASED = 'DECEASED',
  UNKNOWN = 'UNKNOWN',
}

export enum GlossaryTermType {
  PERSON = 'PERSON',
  NICKNAME = 'NICKNAME',
  PLACE = 'PLACE',
  PHRASE = 'PHRASE',
  OTHER = 'OTHER',
}

export enum QuestionInteractionType {
  VIEWED = 'VIEWED',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  CUSTOM_ADDED = 'CUSTOM_ADDED',
}

export enum RecordingUploadStatus {
  CREATED = 'CREATED',
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
}

export enum RecordingAnalysisStatus {
  NOT_REQUESTED = 'NOT_REQUESTED',
  PREVIEW_QUEUED = 'PREVIEW_QUEUED',
  PREVIEW_PROCESSING = 'PREVIEW_PROCESSING',
  PREVIEW_PROCESSED = 'PREVIEW_PROCESSED',
  PREVIEW_FAILED = 'PREVIEW_FAILED',
  FULL_ANALYSIS_QUEUED = 'FULL_ANALYSIS_QUEUED',
  FULL_ANALYSIS_PROCESSING = 'FULL_ANALYSIS_PROCESSING',
  FULLY_INDEXED = 'FULLY_INDEXED',
  FULL_ANALYSIS_FAILED = 'FULL_ANALYSIS_FAILED',
}

export const SubjectAvatarType = {
  DEFAULT: 'DEFAULT',
} as const;

export type SubjectAvatarTypeValue =
  (typeof SubjectAvatarType)[keyof typeof SubjectAvatarType];

export const SubjectReadinessStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  READY: 'READY',
} as const;

export type SubjectReadinessStatusValue =
  (typeof SubjectReadinessStatus)[keyof typeof SubjectReadinessStatus];

export const OnboardingSituation = {
  LIVING: 'living',
  DECEASED: 'deceased',
  VOICE_PERSONA_INTEREST: 'voice_persona_interest',
} as const;

export type OnboardingSituationValue =
  (typeof OnboardingSituation)[keyof typeof OnboardingSituation];

export const onboardingSituationValues = Object.values(OnboardingSituation);
