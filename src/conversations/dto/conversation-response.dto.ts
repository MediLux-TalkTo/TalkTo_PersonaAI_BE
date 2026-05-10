import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';
import { MessageDto } from '../../common/swagger/common.dto';
import { PersonaDto } from '../../personas/dto/persona-response.dto';

export class ConversationDto {
  @ApiProperty({ example: 'conv-001' })
  id: string;

  @ApiProperty({ example: 'persona-grandma-001' })
  personaId: string;

  @ApiProperty({ example: 'TEXT' })
  channel: string;

  @ApiProperty({ example: '주말 대화', nullable: true })
  title: string | null;

  @ApiProperty({ example: '2026-05-10T07:15:00.000Z' })
  startedAt: string;

  @ApiProperty({ example: '2026-05-10T07:20:00.000Z', nullable: true })
  lastMessageAt: string | null;
}

export class ConversationWithMessagesDto extends ConversationDto {
  @ApiProperty({ type: PersonaDto })
  persona: PersonaDto;

  @ApiProperty({ type: [MessageDto] })
  messages: MessageDto[];
}

export class ConversationListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [ConversationDto] })
  data: ConversationDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class ConversationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConversationDto })
  data: ConversationDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class ConversationDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConversationWithMessagesDto })
  data: ConversationWithMessagesDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class AssistantMessageDto extends MessageDto {
  @ApiProperty({ type: [String], example: ['mem-001', 'mem-002'] })
  retrievedMemoryIds: string[];

  @ApiProperty({ example: 824, nullable: true })
  latencyMs?: number | null;

  @ApiProperty({ example: '/audio/assistant-msg.mp3', nullable: true })
  ttsAudioUrl?: string | null;

  @ApiProperty({ example: false, nullable: true })
  fallbackTextUsed?: boolean | null;
}

export class VoiceUserMessageDto extends MessageDto {
  @ApiProperty({ example: '할머니 오늘 뭐 하셨어요?' })
  sttText: string;
}

export class TextMessageExchangeDto {
  @ApiProperty({ type: MessageDto })
  userMessage: MessageDto;

  @ApiProperty({ type: AssistantMessageDto })
  assistantMessage: AssistantMessageDto;
}

export class VoiceMessageExchangeDto {
  @ApiProperty({ type: VoiceUserMessageDto })
  userMessage: VoiceUserMessageDto;

  @ApiProperty({ type: AssistantMessageDto })
  assistantMessage: AssistantMessageDto;
}

export class TextMessageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: TextMessageExchangeDto })
  data: TextMessageExchangeDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class VoiceMessageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: VoiceMessageExchangeDto })
  data: VoiceMessageExchangeDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
