import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ConversationChannel } from '../../common/enums/message.enums';

export class CreateConversationDto {
  @ApiProperty({
    description: '대화에 사용할 페르소나 ID',
    example: 'persona-grandma-001',
  })
  @IsString()
  personaId: string;

  @ApiProperty({
    enum: ConversationChannel,
    example: ConversationChannel.TEXT,
  })
  @IsEnum(ConversationChannel)
  channel: ConversationChannel;

  @ApiPropertyOptional({
    description: '선택적 대화 제목',
    example: '주말 대화',
  })
  @IsOptional()
  @IsString()
  title?: string;
}
