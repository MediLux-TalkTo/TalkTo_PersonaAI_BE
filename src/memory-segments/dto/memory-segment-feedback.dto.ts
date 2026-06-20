import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FeedbackRating } from '../../common/enums/feedback.enum';

export class CreateMemorySegmentFeedbackDto {
  @ApiProperty({ enum: FeedbackRating, example: FeedbackRating.UP })
  @IsEnum(FeedbackRating)
  rating: FeedbackRating;

  @ApiPropertyOptional({
    type: [String],
    example: ['timestamp_issue'],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({ example: 'Timestamp starts a few seconds late.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional({ minimum: 0, example: 12000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reportedStartMs?: number;

  @ApiPropertyOptional({ minimum: 0, example: 31000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reportedEndMs?: number;
}
