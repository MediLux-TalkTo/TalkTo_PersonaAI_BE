import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class PreRegistrationSubmissionDto {
  @ApiProperty({ format: 'uuid' })
  registrationId: string;

  @ApiProperty({ example: 'received' })
  status: string;

  @ApiProperty({ example: 'survey_10' })
  participationType: string;

  @ApiProperty({ example: 'pending_confirmation' })
  benefitStatus: string;

  @ApiProperty({ example: 'wait_for_contact' })
  nextStep: string;
}

export class PreRegistrationSubmissionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: PreRegistrationSubmissionDto })
  data: PreRegistrationSubmissionDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class AdminPreRegistrationItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ example: 'email' })
  contactType: string;

  @ApiProperty()
  contact: string;

  @ApiProperty()
  participationType: string;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional({ nullable: true })
  reasonOther: string | null;

  @ApiProperty()
  contactConsentVersion: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  survey: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  interview: Record<string, unknown> | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  utm: Record<string, unknown>;

  @ApiProperty()
  status: string;

  @ApiProperty()
  benefitStatus: string;

  @ApiPropertyOptional({ nullable: true })
  operatorNotes: string | null;

  @ApiPropertyOptional({ nullable: true })
  contactedAt: string | null;

  @ApiProperty()
  createdAt: string;
}

export class AdminPreRegistrationListDto {
  @ApiProperty({ type: [AdminPreRegistrationItemDto] })
  items: AdminPreRegistrationItemDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 25 })
  limit: number;
}

export class AdminPreRegistrationListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: AdminPreRegistrationListDto })
  data: AdminPreRegistrationListDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class AdminPreRegistrationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: AdminPreRegistrationItemDto })
  data: AdminPreRegistrationItemDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
