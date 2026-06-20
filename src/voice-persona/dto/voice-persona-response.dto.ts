import { ApiProperty } from '@nestjs/swagger';

export class VoicePersonaApplicationResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: Record<string, unknown>;
}

export class VoicePersonaDocumentIntentResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    document: Record<string, unknown>;
    uploadUrl: string;
    method: 'PUT';
  };
}

export class PersonaIntakeResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: Record<string, unknown>;
}

export class TargetVoiceSampleResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: Record<string, unknown>;
}

export class PersonaBuildStatusResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    applicationId: string;
    buildStatus: string;
    documentsStatus: string;
    intakeStatus: string;
    voiceSampleStatus: string;
    lockedReasons: string[];
  };
}
