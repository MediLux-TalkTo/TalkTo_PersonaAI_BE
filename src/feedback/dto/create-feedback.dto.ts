import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FeedbackRating } from '../../common/enums/feedback.enum';

export class CreateFeedbackDto {
  @ApiProperty({ enum: FeedbackRating, example: FeedbackRating.UP })
  @IsEnum(FeedbackRating)
  rating: FeedbackRating;

  @ApiPropertyOptional({ type: [String], example: ['WARM', 'NATURAL'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({ example: '말투가 자연스러웠어요.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
