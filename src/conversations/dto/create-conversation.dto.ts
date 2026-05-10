import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ConversationChannel } from '../../common/enums/message.enums';

export class CreateConversationDto {
  @IsString()
  personaId: string;

  @IsEnum(ConversationChannel)
  channel: ConversationChannel;

  @IsOptional()
  @IsString()
  title?: string;
}
