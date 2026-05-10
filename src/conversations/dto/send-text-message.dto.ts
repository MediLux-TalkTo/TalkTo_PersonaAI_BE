import { IsString, MaxLength } from 'class-validator';

export class SendTextMessageDto {
  @IsString()
  @MaxLength(4000)
  content: string;
}
