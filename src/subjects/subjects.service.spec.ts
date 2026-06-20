import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  GlossaryTermType,
  SubjectAvatarType,
  SubjectLifeStatus,
} from '../common/enums/archive.enums';
import { Role } from '../common/enums/role.enum';
import { AppEventsService } from '../events/events.service';
import { FamilyGlossaryTerm } from './family-glossary-term.entity';
import { Subject } from './subject.entity';
import { SubjectsService } from './subjects.service';

describe('SubjectsService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    delete: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  });

  let service: SubjectsService;
  let subjectsRepository: ReturnType<typeof repository>;
  let glossaryRepository: ReturnType<typeof repository>;
  let appEventsService: { emit: jest.Mock };

  beforeEach(async () => {
    subjectsRepository = repository();
    glossaryRepository = repository();
    appEventsService = { emit: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubjectsService,
        { provide: getRepositoryToken(Subject), useValue: subjectsRepository },
        {
          provide: getRepositoryToken(FamilyGlossaryTerm),
          useValue: glossaryRepository,
        },
        { provide: AppEventsService, useValue: appEventsService },
      ],
    }).compile();

    service = moduleRef.get(SubjectsService);
  });

  it('creates an owned subject profile with default unknown life status', async () => {
    await service.create('user-id', {
      displayName: '할머니',
      relationship: 'grandmother',
    });

    expect(subjectsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'user-id',
        displayName: '할머니',
        relationship: 'grandmother',
        lifeStatus: SubjectLifeStatus.UNKNOWN,
      }),
    );
    expect(appEventsService.emit).toHaveBeenCalledWith({
      userId: 'user-id',
      name: 'subject.created',
      subjectId: undefined,
      payload: {
        relationship: 'grandmother',
        lifeStatus: SubjectLifeStatus.UNKNOWN,
        hasLocaleHint: false,
        hasDialectHint: false,
        hasNotes: false,
      },
    });
  });

  it('maps a subject into the v1 response contract with defaults and caches', () => {
    const subject = Object.assign(new Subject(), {
      id: 'subject-id',
      ownerUserId: 'user-id',
      displayName: '할머니',
      relationship: 'grandmother',
      lifeStatus: SubjectLifeStatus.LIVING,
      localeHint: '부산',
      dialectHint: '경상도 사투리',
      notes: null,
      avatarType: SubjectAvatarType.DEFAULT,
      recordingCountCache: 2,
      recordingSecondsCache: 184,
      memoriesStatus: 'NOT_STARTED',
      personaStatus: 'NOT_STARTED',
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
      updatedAt: new Date('2026-06-17T00:00:00.000Z'),
      glossaryTerms: [],
      recordings: [],
    });

    const response = service.toResponse(subject);

    expect(response).toEqual(
      expect.objectContaining({
        id: 'subject-id',
        displayName: '할머니',
        relationship: 'grandmother',
        relationshipLabel: '할머니',
        regionText: '부산 · 경상도 사투리',
        avatarType: 'DEFAULT',
        recordingCount: 2,
        recordingSeconds: 184,
        memoriesStatus: 'NOT_STARTED',
        personaStatus: 'NOT_STARTED',
      }),
    );
  });

  it('adds glossary terms after legacy owner access check', async () => {
    subjectsRepository.findOne.mockResolvedValue({
      id: 'subject-id',
      ownerUserId: 'user-id',
    });

    await service.addGlossaryTerm('subject-id', 'user-id', {
      termType: GlossaryTermType.PERSON,
      term: '찬민',
      meaning: '손자 이름',
    });

    expect(subjectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'subject-id' },
      relations: ['glossaryTerms'],
    });
    expect(glossaryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: 'subject-id',
        termType: GlossaryTermType.PERSON,
        term: '찬민',
      }),
    );
    expect(appEventsService.emit).toHaveBeenCalledWith({
      userId: 'user-id',
      name: 'subject.glossary_term_added',
      subjectId: 'subject-id',
      payload: {
        termType: GlossaryTermType.PERSON,
        hasPronunciationHint: false,
        hasMeaning: true,
      },
    });
  });

  it('allows owner, admin, and ops subject access while denying non-owner family users', async () => {
    const subject = { id: 'subject-id', ownerUserId: 'owner-id' };
    subjectsRepository.findOne.mockResolvedValue(subject);

    await expect(
      service.getAccessible('subject-id', {
        userId: 'owner-id',
        role: Role.FAMILY,
      }),
    ).resolves.toBe(subject);
    await expect(
      service.getAccessible('subject-id', {
        userId: 'admin-id',
        role: Role.ADMIN,
      }),
    ).resolves.toBe(subject);
    await expect(
      service.getAccessible('subject-id', {
        userId: 'ops-id',
        role: Role.OPS,
      }),
    ).resolves.toBe(subject);
    await expect(
      service.getAccessible('subject-id', {
        userId: 'other-family-id',
        role: Role.FAMILY,
      }),
    ).rejects.toMatchObject({
      response: {
        error: 'subject_forbidden',
      },
    });
    await expect(
      service.getAccessible('subject-id', {
        userId: 'ai-qa-id',
        role: Role.AI_QA,
      }),
    ).rejects.toMatchObject({
      response: {
        error: 'subject_forbidden',
      },
    });

    expect(subjectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'subject-id' },
      relations: ['glossaryTerms'],
    });
  });
});
