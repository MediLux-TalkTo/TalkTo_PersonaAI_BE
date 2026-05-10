import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SendVoiceMessageDto {
  @ApiPropertyOptional({
    description: '클라이언트 또는 STT 임시 텍스트',
    example: '할머니 오늘 뭐 하셨어요?',
  })
  @IsOptional()
  @IsString()
  sttText?: string;

  @ApiPropertyOptional({
    description: '선택적 페르소나 ID',
    example: 'persona-grandma-001',
  })
  @IsOptional()
  @IsString()
  personaId?: string;
}
