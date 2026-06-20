import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRecordingDto {
  @ApiPropertyOptional({ example: '엄마와 저녁 통화', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string | null;

  @ApiPropertyOptional({ example: 'childhood-food', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  relatedQuestionId?: string | null;

  @ApiPropertyOptional({
    example: '어릴 때 제일 좋아했던 음식은 뭐였어요?',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  relatedQuestionText?: string | null;
}
