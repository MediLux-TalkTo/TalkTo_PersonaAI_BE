import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FeedbackRating } from '../../common/enums/feedback.enum';

export class CreateFeedbackDto {
  @IsEnum(FeedbackRating)
  rating: FeedbackRating;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
