import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from './api-meta.dto';

export class MessageDto {
  @ApiProperty({ example: '4b5a95f1-4f50-42c4-b3fd-0ce7963fe9f9' })
  id: string;

  @ApiProperty({ example: '할머니 오늘 뭐 하셨어요?' })
  content: string;

  @ApiProperty({ example: 'TEXT', nullable: true })
  inputMode?: string | null;
}

export class UserSummaryDto {
  @ApiProperty({ example: 'b2c4b198-54e8-4b42-a521-88fc62f5f455' })
  id: string;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiProperty({ example: 'FAMILY' })
  role: string;

  @ApiProperty({ example: true })
  consentRequired: boolean;
}

export class SimpleStatusDto {
  @ApiProperty({ example: true })
  loggedOut: boolean;
}

export class SuccessEnvelopeDto<TData> {
  @ApiProperty({ example: true })
  success: boolean;

  data: TData;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
