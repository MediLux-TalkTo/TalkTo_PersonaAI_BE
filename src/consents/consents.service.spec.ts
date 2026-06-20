import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  ConsentFeature,
  ConsentStatus,
  ConsentType,
} from '../common/enums/consent.enums';
import { AppEventsService } from '../events/events.service';
import { SubjectsService } from '../subjects/subjects.service';
import { Consent } from './consent.entity';
import { ConsentsService } from './consents.service';

describe('ConsentsService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value: Consent | Consent[]) =>
      Array.isArray(value)
        ? value.map((item, index) => ({ ...item, id: `consent-${index + 1}` }))
        : { ...value, id: value.id ?? 'consent-id' },
    ),
  });

  let service: ConsentsService;
  let consentsRepository: ReturnType<typeof repository>;
  let subjectsService: { getOwned: jest.Mock };
  let appEventsService: { emit: jest.Mock };

  beforeEach(async () => {
    consentsRepository = repository();
    subjectsService = {
      getOwned: jest.fn().mockResolvedValue({ id: 'subject-id' }),
    };
    appEventsService = { emit: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConsentsService,
        { provide: getRepositoryToken(Consent), useValue: consentsRepository },
        { provide: SubjectsService, useValue: subjectsService },
        { provide: AppEventsService, useValue: appEventsService },
      ],
    }).compile();

    service = moduleRef.get(ConsentsService);
  });

  it('returns missing Memories requirements when required consents are absent', async () => {
    consentsRepository.find.mockResolvedValue([]);

    const result = await service.getRequirements('user-id', {
      feature: ConsentFeature.MEMORIES,
      subject_id: 'subject-id',
    });

    expect(subjectsService.getOwned).toHaveBeenCalledWith('subject-id', 'user-id');
    expect(result.requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          consent_type: ConsentType.AUDIO_STORAGE_SERVICE,
          status: 'missing',
          blocking_behavior: 'block_if_missing',
        }),
        expect.objectContaining({
          consent_type: ConsentType.AI_ANALYSIS_SERVICE,
          status: 'missing',
        }),
      ]),
    );
  });

  it('stores purpose consent rows for accepted consent types', async () => {
    const result = await service.accept('user-id', {
      subject_id: 'subject-id',
      consents: [
        {
          consent_type: ConsentType.AUDIO_STORAGE_SERVICE,
          version: '2026-06-07',
        },
        {
          consent_type: ConsentType.AI_ANALYSIS_SERVICE,
          version: '2026-06-07',
        },
      ],
    });

    expect(consentsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        subjectId: 'subject-id',
        consentType: ConsentType.AI_ANALYSIS_SERVICE,
        feature: ConsentFeature.MEMORIES,
        status: ConsentStatus.ACCEPTED,
        version: '2026-06-07',
      }),
    );
    expect(result.accepted_features).toEqual([
      ConsentFeature.ARCHIVE,
      ConsentFeature.MEMORIES,
    ]);
    expect(appEventsService.emit).toHaveBeenCalledWith({
      userId: 'user-id',
      name: 'consent.accepted',
      subjectId: 'subject-id',
      payload: {
        acceptedFeatures: [ConsentFeature.ARCHIVE, ConsentFeature.MEMORIES],
        consentTypes: [
          ConsentType.AUDIO_STORAGE_SERVICE,
          ConsentType.AI_ANALYSIS_SERVICE,
        ],
        count: 2,
      },
    });
  });

  it('blocks paid AI features when required consents are missing', async () => {
    consentsRepository.find.mockResolvedValue([
      {
        consentType: ConsentType.AUDIO_STORAGE_SERVICE,
        subjectId: 'subject-id',
        status: ConsentStatus.ACCEPTED,
      },
    ]);

    await expect(
      service.assertRequiredConsents(
        'user-id',
        ConsentFeature.MEMORIES,
        'subject-id',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not treat older accepted consent as active after withdrawal', async () => {
    consentsRepository.find.mockResolvedValue([
      {
        consentType: ConsentType.AI_ANALYSIS_SERVICE,
        subjectId: 'subject-id',
        status: ConsentStatus.WITHDRAWN,
      },
      {
        consentType: ConsentType.AI_ANALYSIS_SERVICE,
        subjectId: 'subject-id',
        status: ConsentStatus.ACCEPTED,
      },
    ]);

    const result = await service.getRequirements('user-id', {
      feature: ConsentFeature.MEMORIES,
      subject_id: 'subject-id',
    });

    expect(result.requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          consent_type: ConsentType.AI_ANALYSIS_SERVICE,
          status: ConsentStatus.WITHDRAWN,
        }),
      ]),
    );
  });
});
