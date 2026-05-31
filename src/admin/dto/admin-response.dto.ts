import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class NegativeFeedbackSummaryItemDto {
  @ApiProperty({ example: '사실이 틀렸어요' })
  tag: string;

  @ApiProperty({ example: 8 })
  count: number;
}

export class NegativeFeedbackSummaryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [NegativeFeedbackSummaryItemDto] })
  data: NegativeFeedbackSummaryItemDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class FeedbackReviewItemDto {
  @ApiProperty({ example: 'fb-001' })
  id: string;

  @ApiProperty({ example: '2026-04-29T14:23:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: 'session_1735478...a3f' })
  sessionId: string;

  @ApiProperty({ example: 'msg-001' })
  messageId: string;

  @ApiProperty({ example: 'DOWN' })
  rating: string;

  @ApiProperty({ type: [String], example: ['사실이 틀렸어요'] })
  tags: string[];

  @ApiProperty({ example: '정말 할머니 목소리 같았어요.', nullable: true })
  comment: string | null;

  @ApiProperty({ example: '어. 불고기는 간장이랑 마늘을 넣고...' })
  messageContent: string;

  @ApiProperty({ example: 'user-001' })
  userId: string;

  @ApiProperty({ example: '홍길동' })
  userName: string;
}

export class FeedbackReviewListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [FeedbackReviewItemDto] })
  data: FeedbackReviewItemDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

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

  @ApiProperty({ example: 0 })
  feedbackNeutralRatio: number;

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

export class DailyMetricsItemDto {
  @ApiProperty({ example: '2026-05-31' })
  date: string;

  @ApiProperty({ example: 3 })
  newUsers: number;

  @ApiProperty({ example: 12 })
  conversationSessions: number;

  @ApiProperty({ example: 84 })
  messages: number;

  @ApiProperty({ example: 18 })
  voiceMessages: number;

  @ApiProperty({ example: 42 })
  assistantMessages: number;

  @ApiProperty({ example: 10 })
  feedbackPositive: number;

  @ApiProperty({ example: 2 })
  feedbackNeutral: number;

  @ApiProperty({ example: 1 })
  feedbackNegative: number;

  @ApiProperty({ example: 13 })
  feedbackTotal: number;

  @ApiProperty({ example: 0.31 })
  feedbackResponseRate: number;
}

export class DailyMetricsDto {
  @ApiProperty({ example: 'Asia/Seoul' })
  timeZone: string;

  @ApiProperty({ example: 14 })
  days: number;

  @ApiProperty({ type: [DailyMetricsItemDto] })
  items: DailyMetricsItemDto[];
}

export class DailyMetricsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: DailyMetricsDto })
  data: DailyMetricsDto;

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
