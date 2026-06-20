import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateVoicePersonaApplicationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subjectId: string;
}

export class CreateVoicePersonaDocumentIntentDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  mimeType: string;

  @ApiProperty()
  @IsString()
  fileSizeBytes: string;
}

export class PersonaIntakeSectionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  sectionKey: string;

  @ApiProperty()
  @IsObject()
  answers: Record<string, unknown>;
}

export class UpsertPersonaIntakeDto {
  @ApiProperty({ type: [PersonaIntakeSectionDto] })
  @IsArray()
  @ArrayMinSize(1)
  sections: PersonaIntakeSectionDto[];
}

export class CreateTargetVoiceSampleDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recordingId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  storageKey?: string;
}
