import { ApiProperty } from '@nestjs/swagger';
import {
  CONSENT_FEATURES,
  CONSENT_STATUSES,
  CONSENT_TYPES,
  ConsentFeature,
  ConsentStatus,
  ConsentType,
} from '../../common/enums/consent.enums';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class ConsentDto {
  @ApiProperty({ example: '73f26a95-cadb-475c-a43a-77c82bd3bb2f' })
  id: string;

  @ApiProperty({ example: 'b2c4b198-54e8-4b42-a521-88fc62f5f455' })
  userId: string;

  @ApiProperty({ example: 'd5c58c8d-8a7d-48e5-b366-b372cafb06e3', nullable: true })
  subjectId: string | null;

  @ApiProperty({ enum: CONSENT_TYPES, nullable: true })
  consentType: ConsentType | null;

  @ApiProperty({ enum: CONSENT_FEATURES, nullable: true })
  feature: ConsentFeature | null;

  @ApiProperty({ example: true })
  required: boolean;

  @ApiProperty({ enum: CONSENT_STATUSES, nullable: true })
  status: ConsentStatus | null;

  @ApiProperty({ example: '2026-06-07', nullable: true })
  version: string | null;

  @ApiProperty({ example: true })
  personaDisclaimerAccepted: boolean;

  @ApiProperty({ example: true })
  conversationStorageAccepted: boolean;

  @ApiProperty({ example: true })
  voiceSynthesisAccepted: boolean;

  @ApiProperty({ example: '2026-05-10T07:15:00.000Z' })
  acceptedAt: string;

  @ApiProperty({ example: null, nullable: true })
  withdrawnAt: string | null;
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

export class ConsentRequirementDto {
  @ApiProperty({ enum: CONSENT_TYPES, example: ConsentType.AUDIO_STORAGE_SERVICE })
  consent_type: ConsentType;

  @ApiProperty({ example: true })
  required: boolean;

  @ApiProperty({
    enum: [...CONSENT_STATUSES, 'missing'],
    example: 'missing',
  })
  status: ConsentStatus | 'missing';

  @ApiProperty({ example: '음성 파일 보관 동의' })
  title: string;

  @ApiProperty({ example: '녹음 파일을 안전하게 보관하기 위해 필요합니다.' })
  summary: string;

  @ApiProperty({ example: 'block_if_missing' })
  blocking_behavior: 'block_if_missing' | 'allow_optional';
}

export class ConsentRequirementsDataDto {
  @ApiProperty({ enum: CONSENT_FEATURES, example: ConsentFeature.MEMORIES })
  feature: ConsentFeature;

  @ApiProperty({ example: 'd5c58c8d-8a7d-48e5-b366-b372cafb06e3', nullable: true })
  subject_id: string | null;

  @ApiProperty({ type: [ConsentRequirementDto] })
  requirements: ConsentRequirementDto[];
}

export class ConsentRequirementsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConsentRequirementsDataDto })
  data: ConsentRequirementsDataDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class AcceptConsentsDataDto {
  @ApiProperty({ enum: CONSENT_FEATURES, isArray: true, example: [ConsentFeature.MEMORIES] })
  accepted_features: ConsentFeature[];

  @ApiProperty({ type: [ConsentDto] })
  consents: ConsentDto[];
}

export class AcceptConsentsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: AcceptConsentsDataDto })
  data: AcceptConsentsDataDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
