import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  RecordingUploadPlatform,
  RecordingUploadSource,
  recordingUploadPlatformValues,
  recordingUploadSourceValues,
} from '../upload-intent.constants';

export class CreateRecordingUploadIntentDto {
  @ApiProperty({ example: 'subject-uuid' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ example: 'call-recording.m4a', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  originalFilename: string;

  @ApiProperty({ example: 'audio/mp4', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  mimeType: string;

  @ApiProperty({ example: 10485760, minimum: 1 })
  @IsInt()
  @Min(1)
  fileSizeBytes: number;

  @ApiPropertyOptional({ example: 420, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60 * 60 * 8)
  durationSeconds?: number;

  @ApiPropertyOptional({ example: '엄마와 저녁 통화' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @ApiPropertyOptional({ example: '찬민' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  conversationPartnerName?: string;

  @ApiPropertyOptional({ example: 'childhood-food' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  relatedQuestionId?: string;

  @ApiPropertyOptional({ example: '어릴 때 제일 좋아했던 음식은 뭐였어요?' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  relatedQuestionText?: string;

  @ApiPropertyOptional({ example: 'sha256:abc...' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileHash?: string;

  @ApiPropertyOptional({
    enum: recordingUploadSourceValues,
    example: RecordingUploadSource.APP_RECORDING,
  })
  @IsOptional()
  @IsIn(recordingUploadSourceValues)
  source?: string;

  @ApiPropertyOptional({
    enum: recordingUploadPlatformValues,
    example: RecordingUploadPlatform.IOS,
  })
  @IsOptional()
  @IsIn(recordingUploadPlatformValues)
  platform?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  singleFile?: boolean;
}
