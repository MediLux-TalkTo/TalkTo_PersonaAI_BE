export const MAX_RECORDING_UPLOAD_BYTES = 512 * 1024 * 1024;

export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/aac',
  'audio/amr',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
  'audio/x-wav',
] as const;

export const RecordingUploadSource = {
  APP_RECORDING: 'app_recording',
  SHARE_EXTENSION: 'share_extension',
  MANUAL_UPLOAD: 'manual_upload',
} as const;

export type RecordingUploadSourceValue =
  (typeof RecordingUploadSource)[keyof typeof RecordingUploadSource];

export const recordingUploadSourceValues = Object.values(RecordingUploadSource);

export const RecordingUploadPlatform = {
  IOS: 'ios',
  ANDROID: 'android',
  WEB: 'web',
} as const;

export type RecordingUploadPlatformValue =
  (typeof RecordingUploadPlatform)[keyof typeof RecordingUploadPlatform];

export const recordingUploadPlatformValues = Object.values(RecordingUploadPlatform);

export const RecordingUploadIntentStatus = {
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
} as const;

export type RecordingUploadIntentStatusValue =
  (typeof RecordingUploadIntentStatus)[keyof typeof RecordingUploadIntentStatus];

export const recordingUploadIntentStatusValues = Object.values(
  RecordingUploadIntentStatus,
);

export const RecordingUploadFailureCode = {
  UNSUPPORTED_MIME_TYPE: 'unsupported_mime_type',
  FILE_TOO_LARGE: 'file_too_large',
  MULTI_FILE_NOT_SUPPORTED: 'multi_file_not_supported',
  UPLOAD_EXPIRED: 'upload_expired',
  OBJECT_MISSING: 'object_missing',
  SIZE_MISMATCH: 'size_mismatch',
  CHECKSUM_MISMATCH: 'checksum_mismatch',
  UPLOAD_CANCELED: 'upload_canceled',
  RETRY_NOT_ALLOWED: 'retry_not_allowed',
  ALREADY_COMPLETED: 'already_completed',
} as const;

export type RecordingUploadFailureCodeValue =
  (typeof RecordingUploadFailureCode)[keyof typeof RecordingUploadFailureCode];

export const recordingUploadFailureCodeValues = Object.values(
  RecordingUploadFailureCode,
);

export const UploadChecksumStatus = {
  VERIFIED: 'verified',
  MISMATCH: 'mismatch',
  NOT_SUPPORTED: 'not_supported',
} as const;

export type UploadChecksumStatusValue =
  (typeof UploadChecksumStatus)[keyof typeof UploadChecksumStatus];

export const uploadChecksumStatusValues = Object.values(UploadChecksumStatus);
