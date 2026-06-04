import { ApiProperty } from '@nestjs/swagger';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../../common/enums/archive.enums';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class RecordingDto {
  @ApiProperty({ example: 'recording-001' })
  id: string;

  @ApiProperty({ example: 'subject-001' })
  subjectId: string;

  @ApiProperty({ example: 'call-recording.m4a' })
  originalFilename: string;

  @ApiProperty({ example: 'audio/mp4' })
  mimeType: string;

  @ApiProperty({ example: 10485760 })
  fileSizeBytes: string;

  @ApiProperty({ example: 420, nullable: true })
  durationSeconds: number | null;

  @ApiProperty({ enum: RecordingUploadStatus })
  uploadStatus: RecordingUploadStatus;

  @ApiProperty({ enum: RecordingAnalysisStatus })
  analysisStatus: RecordingAnalysisStatus;

  @ApiProperty({ example: '엄마와 저녁 통화', nullable: true })
  memo: string | null;

  @ApiProperty({ example: 'childhood-food', nullable: true })
  relatedQuestionId: string | null;

  @ApiProperty({ example: '어릴 때 제일 좋아했던 음식은 뭐였어요?', nullable: true })
  relatedQuestionText: string | null;

  @ApiProperty({ example: '2026-06-05T00:00:00.000Z', nullable: true })
  uploadedAt: Date | null;
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
}

export class RecordingUploadIntentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RecordingUploadIntentDto })
  data: RecordingUploadIntentDto;

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

export class RecordingListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [RecordingDto] })
  data: RecordingDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class RecordingPlaybackUrlDto {
  @ApiProperty({ example: 'https://...' })
  playbackUrl: string;

  @ApiProperty({ example: '2026-06-05T01:00:00.000Z' })
  expiresAt: Date;
}
