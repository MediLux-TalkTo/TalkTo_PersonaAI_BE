import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResearchExportPreferenceDto {
  @ApiProperty()
  optedIn: boolean;

  @ApiPropertyOptional({ nullable: true })
  optedInAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  withdrawnAt: string | null;
}

export class ResearchExportPreferenceResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ResearchExportPreferenceDto })
  data: ResearchExportPreferenceDto;
}

export class ResearchExportPreviewRowDto {
  @ApiProperty()
  memorySegmentId: string;

  @ApiProperty()
  ownerUserId: string;

  @ApiProperty()
  subjectId: string;

  @ApiProperty()
  recordingId: string;

  @ApiProperty()
  startMs: number;

  @ApiProperty()
  endMs: number;

  @ApiProperty()
  eligible: boolean;

  @ApiPropertyOptional({ nullable: true })
  redactedText: string | null;

  @ApiPropertyOptional({ nullable: true })
  exclusionReason: string | null;
}

export class ResearchExportPreviewResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      rows: { type: 'array', items: { $ref: '#/components/schemas/ResearchExportPreviewRow' } },
    },
  })
  data: {
    rows: ResearchExportPreviewRowDto[];
  };
}
