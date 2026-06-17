import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CONSENT_TYPES, ConsentType } from '../../common/enums/consent.enums';

export class ConsentAcceptanceItemDto {
  @ApiProperty({
    enum: CONSENT_TYPES,
    example: ConsentType.AUDIO_STORAGE_SERVICE,
  })
  @IsIn(CONSENT_TYPES)
  consent_type: ConsentType;

  @ApiProperty({ example: '2026-06-07', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  version: string;
}

export class AcceptConsentsDto {
  @ApiPropertyOptional({ example: 'd5c58c8d-8a7d-48e5-b366-b372cafb06e3' })
  @IsOptional()
  @IsUUID()
  subject_id?: string;

  @ApiProperty({ type: [ConsentAcceptanceItemDto] })
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ConsentAcceptanceItemDto)
  consents: ConsentAcceptanceItemDto[];
}
