import { IsOptional, IsString } from 'class-validator';

export class SendVoiceMessageDto {
  @IsOptional()
  @IsString()
  sttText?: string;

  @IsOptional()
  @IsString()
  personaId?: string;
}
