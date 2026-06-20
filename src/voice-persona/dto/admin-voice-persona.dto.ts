import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  VoicePersonaBuildStatus,
  VoicePersonaReviewStatus,
} from '../voice-persona.constants';
import {
  VoiceProviderAssetStatus,
} from '../voice-provider-asset.entity';

export class ReviewVoicePersonaAssetDto {
  @ApiProperty({ enum: Object.values(VoicePersonaReviewStatus) })
  @IsEnum(VoicePersonaReviewStatus)
  status: VoicePersonaReviewStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdatePersonaBuildStatusDto {
  @ApiProperty({ enum: Object.values(VoicePersonaBuildStatus) })
  @IsEnum(VoicePersonaBuildStatus)
  status: VoicePersonaBuildStatus;
}

export class UpsertPersonaBibleDto {
  @ApiProperty({ maxLength: 10000 })
  @IsString()
  @MaxLength(10000)
  contentSummary: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  safetyNotes?: string;
}

export class RegisterVoiceProviderAssetDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  providerName: string;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MaxLength(160)
  externalAssetId: string;

  @ApiPropertyOptional({ enum: Object.values(VoiceProviderAssetStatus) })
  @IsOptional()
  @IsEnum(VoiceProviderAssetStatus)
  status?: VoiceProviderAssetStatus;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
