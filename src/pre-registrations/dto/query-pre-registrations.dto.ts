import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  type PreRegistrationParticipationType as PreRegistrationParticipationTypeValue,
  type PreRegistrationStatus as PreRegistrationStatusValue,
  PreRegistrationParticipationType,
  PreRegistrationStatus,
} from '../pre-registration.constants';

export class QueryPreRegistrationsDto {
  @ApiPropertyOptional({ enum: Object.values(PreRegistrationParticipationType) })
  @IsOptional()
  @IsIn(Object.values(PreRegistrationParticipationType))
  participationType?: PreRegistrationParticipationTypeValue;

  @ApiPropertyOptional({ enum: Object.values(PreRegistrationStatus) })
  @IsOptional()
  @IsIn(Object.values(PreRegistrationStatus))
  status?: PreRegistrationStatusValue;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
