import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { QuestionInteractionType } from '../common/enums/archive.enums';
import { SubjectsService } from '../subjects/subjects.service';
import { QuestionInteraction } from './question-interaction.entity';
import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  });

  let service: QuestionsService;
  let interactionsRepository: ReturnType<typeof repository>;
  let subjectsService: { getOwned: jest.Mock };

  beforeEach(async () => {
    interactionsRepository = repository();
    subjectsService = {
      getOwned: jest.fn().mockResolvedValue({ id: 'subject-id' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: getRepositoryToken(QuestionInteraction), useValue: interactionsRepository },
        { provide: SubjectsService, useValue: subjectsService },
      ],
    }).compile();

    service = moduleRef.get(QuestionsService);
  });

  it('returns default question cards for archive onboarding', () => {
    expect(service.listCards()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'childhood-food' }),
      ]),
    );
  });

  it('records question completion after subject ownership check', async () => {
    await service.recordInteraction('user-id', 'subject-id', {
      questionId: 'childhood-food',
      questionText: '어릴 때 좋아했던 음식은?',
      interactionType: QuestionInteractionType.COMPLETED,
    });

    expect(subjectsService.getOwned).toHaveBeenCalledWith('subject-id', 'user-id');
    expect(interactionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        subjectId: 'subject-id',
        questionId: 'childhood-food',
        interactionType: QuestionInteractionType.COMPLETED,
      }),
    );
  });
});
