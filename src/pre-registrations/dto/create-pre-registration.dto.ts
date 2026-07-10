import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  type InterviewContactMethod as InterviewContactMethodValue,
  type InterviewRecordingDuration as InterviewRecordingDurationValue,
  type InterviewTimeSlot as InterviewTimeSlotValue,
  type PreRegistrationParticipationType as PreRegistrationParticipationTypeValue,
  type PreRegistrationReason as PreRegistrationReasonValue,
  type SurveyConcern as SurveyConcernValue,
  type SurveyInterest as SurveyInterestValue,
  type SurveyRecordingAvailability as SurveyRecordingAvailabilityValue,
  type SurveyVoicePersonaFeeling as SurveyVoicePersonaFeelingValue,
  InterviewContactMethod,
  InterviewRecordingDuration,
  InterviewTimeSlot,
  PreRegistrationParticipationType,
  PreRegistrationReason,
  SurveyConcern,
  SurveyInterest,
  SurveyRecordingAvailability,
  SurveyVoicePersonaFeeling,
} from '../pre-registration.constants';

export class PreRegistrationSurveyDto {
  @ApiProperty({ enum: Object.values(SurveyRecordingAvailability) })
  @IsIn(Object.values(SurveyRecordingAvailability))
  hasRecording: SurveyRecordingAvailabilityValue;

  @ApiProperty({ enum: Object.values(SurveyInterest), isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(Object.values(SurveyInterest), { each: true })
  interests: SurveyInterestValue[];

  @ApiProperty({ enum: Object.values(SurveyVoicePersonaFeeling) })
  @IsIn(Object.values(SurveyVoicePersonaFeeling))
  voicePersonaFeeling: SurveyVoicePersonaFeelingValue;

  @ApiProperty({ enum: Object.values(SurveyConcern), isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(Object.values(SurveyConcern), { each: true })
  concerns: SurveyConcernValue[];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  usageSituation?: string;
}

export class PreRegistrationInterviewDto {
  @ApiProperty({ enum: Object.values(InterviewTimeSlot), isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(Object.values(InterviewTimeSlot), { each: true })
  preferredTimeSlots: InterviewTimeSlotValue[];

  @ApiProperty({ enum: Object.values(InterviewContactMethod) })
  @IsIn(Object.values(InterviewContactMethod))
  preferredContactMethod: InterviewContactMethodValue;

  @ApiProperty({ enum: Object.values(InterviewRecordingDuration) })
  @IsIn(Object.values(InterviewRecordingDuration))
  recordingDuration: InterviewRecordingDurationValue;
}

export class PreRegistrationUtmDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  medium?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  campaign?: string;
}

export class CreatePreRegistrationDto {
  @ApiProperty({ enum: Object.values(PreRegistrationParticipationType) })
  @IsIn(Object.values(PreRegistrationParticipationType))
  participationType: PreRegistrationParticipationTypeValue;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ maxLength: 255, example: '010-0000-0000 or email@talkto.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contact: string;

  @ApiProperty({ enum: Object.values(PreRegistrationReason) })
  @IsIn(Object.values(PreRegistrationReason))
  reason: PreRegistrationReasonValue;

  @ApiPropertyOptional({ maxLength: 500 })
  @ValidateIf((dto: CreatePreRegistrationDto) => dto.reason === PreRegistrationReason.OTHER)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reasonOther?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  contactConsent: boolean;

  @ApiProperty({ maxLength: 80, example: 'landing_beta_contact_v1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  contactConsentVersion: string;

  @ApiPropertyOptional({ type: PreRegistrationSurveyDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PreRegistrationSurveyDto)
  survey?: PreRegistrationSurveyDto;

  @ApiPropertyOptional({ type: PreRegistrationInterviewDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PreRegistrationInterviewDto)
  interview?: PreRegistrationInterviewDto;

  @ApiPropertyOptional({ type: PreRegistrationUtmDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PreRegistrationUtmDto)
  utm?: PreRegistrationUtmDto;
}
