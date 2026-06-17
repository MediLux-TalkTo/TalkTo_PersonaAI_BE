import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import {
  CONSENT_FEATURES,
  ConsentFeature,
} from '../../common/enums/consent.enums';

export class QueryConsentRequirementsDto {
  @ApiProperty({ enum: CONSENT_FEATURES, example: ConsentFeature.MEMORIES })
  @IsIn(CONSENT_FEATURES)
  feature: ConsentFeature;

  @ApiPropertyOptional({ example: 'd5c58c8d-8a7d-48e5-b366-b372cafb06e3' })
  @IsOptional()
  @IsUUID()
  subject_id?: string;
}
