import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { QuestionInteractionType } from '../../common/enums/archive.enums';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class QuestionCardDto {
  @ApiProperty({ example: 'childhood-food' })
  id: string;

  @ApiProperty({ example: '어릴 때 제일 좋아했던 음식은 뭐였어요?' })
  text: string;

  @ApiProperty({ example: '어린시절' })
  category: string;

  @ApiProperty({ example: 1 })
  emotionalWeight: number;
}

export class QuestionCardListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [QuestionCardDto] })
  data: QuestionCardDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class CreateQuestionInteractionDto {
  @ApiPropertyOptional({ example: 'childhood-food' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  questionId?: string;

  @ApiProperty({ example: '어릴 때 제일 좋아했던 음식은 뭐였어요?' })
  @IsString()
  @MaxLength(500)
  questionText: string;

  @ApiPropertyOptional({ example: '어린시절' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({
    enum: QuestionInteractionType,
    example: QuestionInteractionType.COMPLETED,
  })
  @IsEnum(QuestionInteractionType)
  interactionType: QuestionInteractionType;

  @ApiPropertyOptional({ example: '통화 후 업로드 완료' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
