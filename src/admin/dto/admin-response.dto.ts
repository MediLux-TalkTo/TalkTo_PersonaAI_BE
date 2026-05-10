import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class MetricsOverviewDto {
  @ApiProperty({ example: 12 })
  usersTotal: number;

  @ApiProperty({ example: 87 })
  conversationsTotal: number;

  @ApiProperty({ example: 642 })
  messagesTotal: number;

  @ApiProperty({ example: 204 })
  voiceMessagesTotal: number;

  @ApiProperty({ example: 0.83 })
  feedbackPositiveRatio: number;

  @ApiProperty({ example: 0.17 })
  feedbackNegativeRatio: number;
}

export class MetricsOverviewResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MetricsOverviewDto })
  data: MetricsOverviewDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class SystemLogDto {
  @ApiProperty({ example: 'log-001' })
  id: string;

  @ApiProperty({ example: 'STT' })
  category: string;

  @ApiProperty({ example: 'ERROR' })
  severity: string;

  @ApiProperty({ example: 'conv-001', nullable: true })
  conversationId: string | null;

  @ApiProperty({ example: 'msg-001', nullable: true })
  messageId: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { reason: 'voice_message_failed' },
  })
  detail: Record<string, unknown>;

  @ApiProperty({ example: '2026-05-10T07:15:00.000Z' })
  occurredAt: string;
}

export class SystemLogListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [SystemLogDto] })
  data: SystemLogDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
