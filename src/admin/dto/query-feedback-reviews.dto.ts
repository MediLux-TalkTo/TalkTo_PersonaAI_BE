import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { FeedbackRating } from '../../common/enums/feedback.enum';

export class QueryFeedbackReviewsDto {
  @ApiPropertyOptional({ enum: FeedbackRating, example: FeedbackRating.DOWN })
  @IsOptional()
  @IsEnum(FeedbackRating)
  rating?: FeedbackRating;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
