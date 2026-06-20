import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../../common/enums/archive.enums';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';
import { RecordingArchiveStatus } from '../recording.entity';
import {
  MAX_RECORDING_UPLOAD_BYTES,
  recordingUploadFailureCodeValues,
  recordingUploadIntentStatusValues,
  recordingUploadPlatformValues,
  recordingUploadSourceValues,
  SUPPORTED_AUDIO_MIME_TYPES,
  uploadChecksumStatusValues,
} from '../upload-intent.constants';

export const RecordingSummaryStatus = {
  LOCKED_UNTIL_MEMORIES: 'locked_until_memories',
} as const;

export const RecordingMemoriesCta = {
  LOCKED_UNTIL_MEMORIES: 'locked_until_memories',
} as const;

export class RecordingDto {
  @ApiProperty({ example: 'recording-001' })
  id: string;

  @ApiProperty({ example: 'subject-001' })
  subject_id: string;

  @ApiProperty({ example: 'call-recording.m4a' })
  original_filename: string;

  @ApiProperty({ example: 'audio/mp4' })
  mime_type: string;

  @ApiProperty({ example: 10485760 })
  file_size_bytes: string;

  @ApiProperty({ example: 420, nullable: true })
  duration_seconds: number | null;

  @ApiProperty({ enum: RecordingUploadStatus })
  upload_status: RecordingUploadStatus;

  @ApiProperty({ enum: RecordingAnalysisStatus })
  analysis_status: RecordingAnalysisStatus;

  @ApiProperty({ enum: RecordingArchiveStatus })
  archive_status: RecordingArchiveStatus;

  @ApiProperty({ example: 'not_analyzed' })
  analysis_stage: string;

  @ApiProperty({ example: 'locked_until_memories' })
  memories_status: string;

  @ApiProperty({ enum: uploadChecksumStatusValues, example: 'not_supported' })
  checksum_status: string;

  @ApiProperty({ example: '엄마와 저녁 통화', nullable: true })
  memo: string | null;

  @ApiProperty({ example: 'childhood-food', nullable: true })
  related_question_id: string | null;

  @ApiProperty({ example: '어릴 때 제일 좋아했던 음식은 뭐였어요?', nullable: true })
  related_question_text: string | null;

  @ApiProperty({ example: 3 })
  recording_count: number;

  @ApiProperty({ example: 1260 })
  total_recording_seconds: number;

  @ApiProperty({ example: 'ready' })
  status_badge: string;

  @ApiProperty({ example: RecordingMemoriesCta.LOCKED_UNTIL_MEMORIES })
  memories_cta: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: null,
    nullable: true,
  })
  summary: null;

  @ApiProperty({ example: RecordingSummaryStatus.LOCKED_UNTIL_MEMORIES })
  summary_status: string;

  @ApiProperty({ example: '2026-06-05T00:00:00.000Z', nullable: true })
  uploaded_at: Date | null;

  @ApiProperty({ example: '2026-06-05T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-05T00:00:00.000Z' })
  updated_at: Date;

  @ApiProperty({ example: null, nullable: true })
  deleted_at: Date | null;
}

export class RecordingUploadIntentDto {
  @ApiProperty({ type: RecordingDto })
  recording: RecordingDto;

  @ApiProperty({ example: 'PUT' })
  method: string;

  @ApiProperty({ example: 'https://...' })
  uploadUrl: string;

  @ApiProperty({ example: 'archive/user/subject/file.m4a' })
  storageKey: string;

  @ApiProperty({ example: '2026-06-05T01:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: 'upload-intent-001' })
  uploadIntentId: string;

  @ApiProperty({ enum: recordingUploadIntentStatusValues, example: 'uploading' })
  status: string;

  @ApiProperty({ enum: recordingUploadSourceValues, example: 'app_recording' })
  source: string;

  @ApiProperty({ enum: recordingUploadPlatformValues, example: 'ios' })
  platform: string;

  @ApiProperty({ example: true })
  singleFile: boolean;

  @ApiProperty({
    enum: recordingUploadFailureCodeValues,
    nullable: true,
    example: null,
  })
  failureCode: string | null;
}

export class RecordingUploadIntentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RecordingUploadIntentDto })
  data: RecordingUploadIntentDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

@ApiSchema({ name: 'RecordingUploadIntentState' })
export class RecordingUploadIntentStateDto {
  @ApiProperty({ example: 'upload-intent-001' })
  id: string;

  @ApiProperty({ example: 'recording-001' })
  recordingId: string;

  @ApiProperty({ example: 'subject-001' })
  subjectId: string;

  @ApiProperty({ enum: recordingUploadSourceValues, example: 'app_recording' })
  source: string;

  @ApiProperty({ enum: recordingUploadPlatformValues, example: 'ios' })
  platform: string;

  @ApiProperty({ example: true })
  singleFile: boolean;

  @ApiProperty({ enum: recordingUploadIntentStatusValues, example: 'canceled' })
  status: string;

  @ApiProperty({
    enum: recordingUploadFailureCodeValues,
    nullable: true,
    example: 'upload_canceled',
  })
  failureCode: string | null;

  @ApiProperty({ example: 'call-recording.m4a' })
  originalFilename: string;

  @ApiProperty({ example: 'audio/mp4' })
  mimeType: string;

  @ApiProperty({ example: '10485760' })
  expectedFileSizeBytes: string;

  @ApiProperty({ example: 'archive/user/subject/file.m4a' })
  storageKey: string;

  @ApiProperty({ example: '2026-06-05T01:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: null, nullable: true })
  completedAt: Date | null;

  @ApiProperty({ example: '2026-06-05T00:30:00.000Z', nullable: true })
  canceledAt: Date | null;
}

@ApiSchema({ name: 'RecordingUploadIntentStateResponse' })
export class RecordingUploadIntentStateResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RecordingUploadIntentStateDto })
  data: RecordingUploadIntentStateDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class RecordingResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RecordingDto })
  data: RecordingDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class RecordingArchiveListDto {
  @ApiProperty({ type: [RecordingDto] })
  recordings: RecordingDto[];

  @ApiProperty({ example: 3 })
  recording_count: number;

  @ApiProperty({ example: 1260 })
  total_recording_seconds: number;

  @ApiProperty({ example: 'ready' })
  status_badge: string;

  @ApiProperty({ example: RecordingMemoriesCta.LOCKED_UNTIL_MEMORIES })
  memories_cta: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: null,
    nullable: true,
  })
  summary: null;

  @ApiProperty({ example: RecordingSummaryStatus.LOCKED_UNTIL_MEMORIES })
  summary_status: string;
}

export class RecordingListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: () => RecordingArchiveListDto })
  data: RecordingArchiveListDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class RecordingPlaybackUrlDto {
  @ApiProperty({ example: 'https://...' })
  playback_url: string;

  @ApiProperty({ example: '2026-06-05T01:00:00.000Z' })
  expires_at: Date;

  @ApiProperty({ example: 3600 })
  ttl_seconds: number;

  @ApiProperty({ example: false })
  download_allowed: boolean;
}

export class RecordingUploadGuideDto {
  @ApiProperty({ enum: SUPPORTED_AUDIO_MIME_TYPES, isArray: true })
  supported_mime_types: string[];

  @ApiProperty({ example: MAX_RECORDING_UPLOAD_BYTES })
  max_file_size_bytes: number;

  @ApiProperty({ example: true })
  single_file_only: boolean;

  @ApiProperty({ enum: recordingUploadSourceValues, isArray: true })
  sources: string[];

  @ApiProperty({ enum: recordingUploadPlatformValues, isArray: true })
  platforms: string[];

  @ApiProperty({ enum: recordingUploadIntentStatusValues, isArray: true })
  lifecycle: string[];

  @ApiProperty({ enum: recordingUploadFailureCodeValues, isArray: true })
  failure_codes: string[];

  @ApiProperty({ enum: uploadChecksumStatusValues, isArray: true })
  checksum_statuses: string[];
}

export class RecordingUploadGuideResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RecordingUploadGuideDto })
  data: RecordingUploadGuideDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
