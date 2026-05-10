import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class ConsentDto {
  @ApiProperty({ example: '73f26a95-cadb-475c-a43a-77c82bd3bb2f' })
  id: string;

  @ApiProperty({ example: 'b2c4b198-54e8-4b42-a521-88fc62f5f455' })
  userId: string;

  @ApiProperty({ example: true })
  personaDisclaimerAccepted: boolean;

  @ApiProperty({ example: true })
  conversationStorageAccepted: boolean;

  @ApiProperty({ example: true })
  voiceSynthesisAccepted: boolean;

  @ApiProperty({ example: '2026-05-10T07:15:00.000Z' })
  acceptedAt: string;
}

export class ConsentStatusDataDto {
  @ApiProperty({ type: ConsentDto, nullable: true })
  consent: ConsentDto | null;

  @ApiProperty({ example: false })
  consentRequired: boolean;
}

export class ConsentStatusResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConsentStatusDataDto })
  data: ConsentStatusDataDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class ConsentCreateResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConsentDto })
  data: ConsentDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
