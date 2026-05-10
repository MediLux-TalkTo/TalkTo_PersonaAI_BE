import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SendTextMessageDto {
  @ApiProperty({
    description: '사용자 텍스트 메시지',
    example: '할머니 오늘 뭐 하셨어요?',
    maxLength: 4000,
  })
  @IsString()
  @MaxLength(4000)
  content: string;
}
