import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteRecordingUploadDto {
  @ApiPropertyOptional({ example: 'sha256:abc...' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileHash?: string;
}
