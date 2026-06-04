import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { SubjectLifeStatus, GlossaryTermType } from '../common/enums/archive.enums';
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

  beforeEach(async () => {
    subjectsRepository = repository();
    glossaryRepository = repository();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubjectsService,
        { provide: getRepositoryToken(Subject), useValue: subjectsRepository },
        {
          provide: getRepositoryToken(FamilyGlossaryTerm),
          useValue: glossaryRepository,
        },
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
  });

  it('adds glossary terms only after ownership check', async () => {
    subjectsRepository.findOne.mockResolvedValue({ id: 'subject-id' });

    await service.addGlossaryTerm('subject-id', 'user-id', {
      termType: GlossaryTermType.PERSON,
      term: '찬민',
      meaning: '손자 이름',
    });

    expect(subjectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'subject-id', ownerUserId: 'user-id' },
      relations: ['glossaryTerms'],
    });
    expect(glossaryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: 'subject-id',
        termType: GlossaryTermType.PERSON,
        term: '찬민',
      }),
    );
  });
});
