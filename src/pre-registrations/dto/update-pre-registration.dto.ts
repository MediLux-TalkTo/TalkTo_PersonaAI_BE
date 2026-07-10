import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  type PreRegistrationBenefitStatus as PreRegistrationBenefitStatusValue,
  type PreRegistrationStatus as PreRegistrationStatusValue,
  PreRegistrationBenefitStatus,
  PreRegistrationStatus,
} from '../pre-registration.constants';

export class UpdatePreRegistrationDto {
  @ApiPropertyOptional({ enum: Object.values(PreRegistrationStatus) })
  @IsOptional()
  @IsIn(Object.values(PreRegistrationStatus))
  status?: PreRegistrationStatusValue;

  @ApiPropertyOptional({ enum: Object.values(PreRegistrationBenefitStatus) })
  @IsOptional()
  @IsIn(Object.values(PreRegistrationBenefitStatus))
  benefitStatus?: PreRegistrationBenefitStatusValue;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  operatorNotes?: string;
}
