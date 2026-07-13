import { BadRequestException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreatePreRegistrationDto } from './dto/create-pre-registration.dto';
import { PreRegistration } from './pre-registration.entity';
import { PreRegistrationsService } from './pre-registrations.service';

describe('PreRegistrationsService', () => {
  const preRegistrationsRepository = {
    create: jest.fn((value) => value),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const auditService = {
    recordSensitiveRead: jest.fn(),
    recordSensitiveWrite: jest.fn(),
  };
  let service: PreRegistrationsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    preRegistrationsRepository.create.mockImplementation((value) => value);
    preRegistrationsRepository.findOne.mockResolvedValue(null);
    preRegistrationsRepository.findAndCount.mockResolvedValue([[], 0]);
    preRegistrationsRepository.save.mockImplementation(async (value) => ({
      ...value,
      id: 'registration-id',
      createdAt: new Date('2026-07-11T00:00:00.000Z'),
      updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        PreRegistrationsService,
        {
          provide: getRepositoryToken(PreRegistration),
          useValue: preRegistrationsRepository,
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = moduleRef.get(PreRegistrationsService);
  });

  it('stores survey answers and marks the survey discount as pending confirmation', async () => {
    const submission = await service.create(buildSurveySubmission(), undefined);

    expect(submission).toEqual({
      registrationId: 'registration-id',
      status: 'received',
      participationType: 'survey_10',
      benefitStatus: 'pending_confirmation',
      nextStep: 'wait_for_contact',
    });
    expect(preRegistrationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contactType: 'email',
        contact: 'email@talkto.com',
        survey: expect.objectContaining({
          desiredFeatures: ['archive_recordings', 'voice_persona'],
          voiceLossRegret: 5,
        }),
        interview: null,
      }),
    );
    expect(auditService.recordSensitiveWrite).toHaveBeenCalledWith({
      resourceType: 'pre_registration',
      resourceId: 'registration-id',
      metadata: {
        event: 'submitted',
        participationType: 'survey_10',
        benefitStatus: 'pending_confirmation',
      },
    });
  });

  it('rejects survey data on an early-access submission', async () => {
    const invalidSubmission: CreatePreRegistrationDto = {
      ...buildEarlyAccessSubmission(),
      survey: buildSurveySubmission().survey,
    };

    await expect(service.create(invalidSubmission, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(preRegistrationsRepository.save).not.toHaveBeenCalled();
  });

  it('stores interview answers and marks the interview discount as pending confirmation', async () => {
    const submission = await service.create(buildInterviewSubmission(), undefined);

    expect(submission.benefitStatus).toBe('pending_confirmation');
    expect(preRegistrationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        participationType: 'interview_20',
        survey: null,
        interview: expect.objectContaining({ preferredContactMethod: 'kakao' }),
      }),
    );
  });

  it('returns an existing submission for an idempotency retry', async () => {
    preRegistrationsRepository.findOne.mockResolvedValueOnce({
      id: 'existing-id',
      status: 'received',
      participationType: 'early_access',
      benefitStatus: 'not_applicable',
    });

    await expect(
      service.create(buildEarlyAccessSubmission(), 'c68c1d3a-b9a1-4f08-9d10-5b5b57d7c848'),
    ).resolves.toMatchObject({ registrationId: 'existing-id' });
    expect(preRegistrationsRepository.save).not.toHaveBeenCalled();
  });

  it('rejects missing contact consent without saving', async () => {
    await expect(
      service.create({ ...buildEarlyAccessSubmission(), contactConsent: false }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(preRegistrationsRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an already registered normalized contact', async () => {
    preRegistrationsRepository.findOne.mockResolvedValueOnce({ id: 'existing-id' });

    await expect(service.create(buildEarlyAccessSubmission(), undefined)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(preRegistrationsRepository.save).not.toHaveBeenCalled();
  });

  it('maps a concurrent contact unique-constraint failure to conflict', async () => {
    preRegistrationsRepository.save.mockRejectedValueOnce(
      new QueryFailedError(
        'INSERT INTO pre_registrations',
        [],
        Object.assign(new Error('duplicate key value'), { code: '23505' }),
      ),
    );

    await expect(service.create(buildEarlyAccessSubmission(), undefined)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns the existing submission after a concurrent idempotency-key conflict', async () => {
    preRegistrationsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'existing-id',
        status: 'received',
        participationType: 'early_access',
        benefitStatus: 'not_applicable',
      });
    preRegistrationsRepository.save.mockRejectedValueOnce(
      new QueryFailedError(
        'INSERT INTO pre_registrations',
        [],
        Object.assign(new Error('duplicate key value'), { code: '23505' }),
      ),
    );

    await expect(
      service.create(buildEarlyAccessSubmission(), 'c68c1d3a-b9a1-4f08-9d10-5b5b57d7c848'),
    ).resolves.toMatchObject({ registrationId: 'existing-id' });
  });

  it('records only filter metadata for an admin list read', async () => {
    await service.listForAdmin('admin-id', { participationType: 'survey_10' });

    expect(auditService.recordSensitiveRead).toHaveBeenCalledWith({
      actorUserId: 'admin-id',
      resourceType: 'pre_registration',
      metadata: {
        participationType: 'survey_10',
        status: 'all',
        page: 1,
        limit: 25,
      },
    });
  });
});

function buildEarlyAccessSubmission(): CreatePreRegistrationDto {
  return {
    participationType: 'early_access',
    name: 'Hong Gil Dong',
    contact: 'email@talkto.com',
    reason: 'voice_persona_interest',
    contactConsent: true,
    contactConsentVersion: 'landing_beta_contact_v1',
  };
}

function buildSurveySubmission(): CreatePreRegistrationDto {
  return {
    ...buildEarlyAccessSubmission(),
    participationType: 'survey_10',
    survey: {
      firstSituation: 'preserve_living_family_voice',
      recordingAvailability: 'between_3_and_9',
      recordSearchExperience: 'hard_to_find',
      voiceLossRegret: 5,
      desiredFeatures: ['archive_recordings', 'voice_persona'],
      voicePersonaFeeling: 'eager',
      concerns: ['privacy_storage'],
    },
  };
}

function buildInterviewSubmission(): CreatePreRegistrationDto {
  return {
    ...buildEarlyAccessSubmission(),
    participationType: 'interview_20',
    interview: {
      preferredTimeSlots: ['weekend_daytime'],
      preferredContactMethod: 'kakao',
      recordingDuration: 'between_10_and_30_min',
    },
  };
}
