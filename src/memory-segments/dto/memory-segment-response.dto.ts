import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackRating } from '../../common/enums/feedback.enum';

export class MemorySegmentPlaybackDto {
  @ApiProperty()
  playbackUrl: string;

  @ApiProperty()
  expiresAt: string;

  @ApiProperty()
  ttlSeconds: number;

  @ApiProperty({ example: false })
  downloadAllowed: false;

  @ApiProperty()
  segmentStartMs: number;

  @ApiProperty()
  segmentEndMs: number;

  @ApiProperty()
  bufferMs: number;
}

export class MemorySegmentPlaybackResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MemorySegmentPlaybackDto })
  data: MemorySegmentPlaybackDto;
}

export class MemorySegmentFeedbackDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  memorySegmentId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: FeedbackRating })
  rating: FeedbackRating;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional({ nullable: true })
  comment: string | null;

  @ApiPropertyOptional({ nullable: true })
  reportedStartMs: number | null;

  @ApiPropertyOptional({ nullable: true })
  reportedEndMs: number | null;
}

export class MemorySegmentFeedbackResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MemorySegmentFeedbackDto })
  data: MemorySegmentFeedbackDto;
}
