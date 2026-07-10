import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  PreRegistrationParticipationType,
  type PreRegistrationReason,
} from './pre-registration.constants';
import { CreatePreRegistrationDto } from './dto/create-pre-registration.dto';

export function assertSubmissionShape(dto: CreatePreRegistrationDto): void {
  if (dto.participationType === PreRegistrationParticipationType.EARLY_ACCESS) {
    if (dto.survey || dto.interview) {
      throw invalidSubmission('Early access cannot include survey or interview answers.');
    }
    return;
  }
  if (dto.participationType === PreRegistrationParticipationType.SURVEY_10) {
    if (!dto.survey || dto.interview) {
      throw invalidSubmission('Survey participation requires survey answers only.');
    }
    return;
  }
  if (dto.participationType === PreRegistrationParticipationType.INTERVIEW_20) {
    if (!dto.interview || dto.survey) {
      throw invalidSubmission('Interview participation requires interview answers only.');
    }
  }
}

export function assertRequiredText(value: string, code: string, message: string): void {
  if (!value.trim()) {
    throw new BadRequestException({ code, message });
  }
}

export function assertReasonOther(reason: PreRegistrationReason, reasonOther: string | undefined): void {
  if (reason === 'other') {
    assertRequiredText(
      reasonOther ?? '',
      'reason_other_required',
      'A reason detail is required when reason is other.',
    );
  }
}

export function assertContactConsent(contactConsent: boolean): void {
  if (!contactConsent) {
    throw new BadRequestException({
      code: 'contact_consent_required',
      message: 'Contact consent is required for a pre-registration.',
    });
  }
}

export function assertIdempotencyKey(idempotencyKey: string | undefined): void {
  if (idempotencyKey && !isUUID(idempotencyKey, '4')) {
    throw new BadRequestException({
      code: 'invalid_idempotency_key',
      message: 'Idempotency-Key must be a UUID v4.',
    });
  }
}

function invalidSubmission(message: string): BadRequestException {
  return new BadRequestException({ code: 'invalid_pre_registration_submission', message });
}
