import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class FeedbackDto {
  @ApiProperty({ example: 'fb-001' })
  id: string;

  @ApiProperty({ example: 'msg-001' })
  messageId: string;

  @ApiProperty({ example: 'user-001' })
  userId: string;

  @ApiProperty({ example: 'UP' })
  rating: string;

  @ApiProperty({ type: [String], example: ['WARM', 'NATURAL'] })
  tags: string[];

  @ApiProperty({ example: '말투가 자연스러웠어요.', nullable: true })
  comment: string | null;
}

export class FeedbackResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: FeedbackDto })
  data: FeedbackDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class FeedbackListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [FeedbackDto] })
  data: FeedbackDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
