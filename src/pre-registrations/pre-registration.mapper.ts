import { BadRequestException } from '@nestjs/common';
import type {
  CreatePreRegistrationDto,
  PreRegistrationInterviewDto,
  PreRegistrationSurveyDto,
  PreRegistrationUtmDto,
} from './dto/create-pre-registration.dto';
import {
  PreRegistrationBenefitStatus,
  PreRegistrationContactType,
  PreRegistrationParticipationType,
  PreRegistrationStatus,
  type PreRegistrationBenefitStatus as PreRegistrationBenefitStatusValue,
  type PreRegistrationContactType as PreRegistrationContactTypeValue,
  type PreRegistrationInterview,
  type PreRegistrationSurvey,
  type PreRegistrationUtm,
} from './pre-registration.constants';
import { PreRegistration } from './pre-registration.entity';

export type NormalizedContact = {
  readonly type: PreRegistrationContactTypeValue;
  readonly value: string;
};

type NewPreRegistrationAttributes = Pick<
  PreRegistration,
  | 'name'
  | 'contactType'
  | 'contact'
  | 'contactNormalized'
  | 'participationType'
  | 'reason'
  | 'reasonOther'
  | 'contactConsent'
  | 'contactConsentVersion'
  | 'survey'
  | 'interview'
  | 'utm'
  | 'status'
  | 'benefitStatus'
  | 'operatorNotes'
  | 'idempotencyKey'
  | 'contactedAt'
>;

export function benefitStatusFor(
  participationType: PreRegistrationParticipationType,
): PreRegistrationBenefitStatusValue {
  return participationType === PreRegistrationParticipationType.EARLY_ACCESS
    ? PreRegistrationBenefitStatus.NOT_APPLICABLE
    : PreRegistrationBenefitStatus.PENDING_CONFIRMATION;
}

export function normalizeContact(contact: string): NormalizedContact {
  const trimmed = contact.trim();
  const email = trimmed.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { type: PreRegistrationContactType.EMAIL, value: email };
  }

  const phone = trimmed.replace(/[^0-9]/g, '');
  if (/^01[016789][0-9]{7,8}$/.test(phone)) {
    return { type: PreRegistrationContactType.PHONE, value: phone };
  }

  throw new BadRequestException({
    code: 'invalid_contact',
    message: 'Contact must be a valid email address or Korean mobile number.',
  });
}

export function toSurvey(dto: PreRegistrationSurveyDto): PreRegistrationSurvey {
  return {
    hasRecording: dto.hasRecording,
    interests: dto.interests,
    voicePersonaFeeling: dto.voicePersonaFeeling,
    concerns: dto.concerns,
    usageSituation: dto.usageSituation?.trim() || null,
  };
}

export function toInterview(
  dto: PreRegistrationInterviewDto,
): PreRegistrationInterview {
  return {
    preferredTimeSlots: dto.preferredTimeSlots,
    preferredContactMethod: dto.preferredContactMethod,
    recordingDuration: dto.recordingDuration,
  };
}

export function compactUtm(dto: PreRegistrationUtmDto | undefined): PreRegistrationUtm {
  return {
    ...(dto?.source?.trim() ? { source: dto.source.trim() } : {}),
    ...(dto?.medium?.trim() ? { medium: dto.medium.trim() } : {}),
    ...(dto?.campaign?.trim() ? { campaign: dto.campaign.trim() } : {}),
  };
}

export function toNewPreRegistration(
  dto: CreatePreRegistrationDto,
  normalizedContact: NormalizedContact,
  idempotencyKey: string | undefined,
): NewPreRegistrationAttributes {
  return {
    name: dto.name.trim(),
    contactType: normalizedContact.type,
    contact: normalizedContact.value,
    contactNormalized: normalizedContact.value,
    participationType: dto.participationType,
    reason: dto.reason,
    reasonOther: dto.reasonOther?.trim() || null,
    contactConsent: dto.contactConsent,
    contactConsentVersion: dto.contactConsentVersion.trim(),
    survey: dto.survey ? toSurvey(dto.survey) : null,
    interview: dto.interview ? toInterview(dto.interview) : null,
    utm: compactUtm(dto.utm),
    status: PreRegistrationStatus.RECEIVED,
    benefitStatus: benefitStatusFor(dto.participationType),
    operatorNotes: null,
    idempotencyKey: idempotencyKey ?? null,
    contactedAt: null,
  };
}

export function toAdminPreRegistrationItem(registration: PreRegistration) {
  return {
    id: registration.id,
    name: registration.name,
    contactType: registration.contactType,
    contact: registration.contact,
    participationType: registration.participationType,
    reason: registration.reason,
    reasonOther: registration.reasonOther,
    contactConsentVersion: registration.contactConsentVersion,
    survey: registration.survey,
    interview: registration.interview,
    utm: registration.utm,
    status: registration.status,
    benefitStatus: registration.benefitStatus,
    operatorNotes: registration.operatorNotes,
    contactedAt: registration.contactedAt?.toISOString() ?? null,
    createdAt: registration.createdAt.toISOString(),
  };
}
