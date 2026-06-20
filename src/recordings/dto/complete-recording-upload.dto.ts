import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CompleteRecordingUploadDto {
  @ApiPropertyOptional({ example: 'upload-intent-uuid' })
  @IsOptional()
  @IsUUID()
  uploadIntentId?: string;

  @ApiPropertyOptional({ example: 'sha256:abc...' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileHash?: string;
}
