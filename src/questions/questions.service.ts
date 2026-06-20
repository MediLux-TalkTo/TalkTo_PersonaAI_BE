import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppEventsService } from '../events/events.service';
import { SubjectsService } from '../subjects/subjects.service';
import { QuestionInteraction } from './question-interaction.entity';
import { CreateQuestionInteractionDto, QuestionCardDto } from './dto/question.dto';

const DEFAULT_QUESTION_CARDS: QuestionCardDto[] = [
  {
    id: 'childhood-food',
    text: '어릴 때 제일 좋아했던 음식은 뭐였어요?',
    category: '어린시절',
    emotionalWeight: 1,
  },
  {
    id: 'family-memory',
    text: '가족들이랑 함께했던 날 중에 가장 기억나는 날은 언제예요?',
    category: '가족',
    emotionalWeight: 2,
  },
  {
    id: 'daily-routine',
    text: '요즘 하루 중에 제일 편안한 시간은 언제예요?',
    category: '일상',
    emotionalWeight: 1,
  },
  {
    id: 'life-advice',
    text: '살면서 가장 오래 기억에 남는 조언이 있어요?',
    category: '가치관',
    emotionalWeight: 2,
  },
  {
    id: 'favorite-place',
    text: '다시 가보고 싶은 장소가 있다면 어디예요?',
    category: '장소',
    emotionalWeight: 1,
  },
];

@Injectable()
export class QuestionsService {
  constructor(
    private readonly subjectsService: SubjectsService,
    private readonly appEventsService: AppEventsService,
    @InjectRepository(QuestionInteraction)
    private readonly interactionsRepository: Repository<QuestionInteraction>,
  ) {}

  listCards(): QuestionCardDto[] {
    return DEFAULT_QUESTION_CARDS;
  }

  async recordInteraction(
    userId: string,
    subjectId: string,
    dto: CreateQuestionInteractionDto,
  ): Promise<QuestionInteraction> {
    await this.subjectsService.getOwned(subjectId, userId);

    const interaction = this.interactionsRepository.create({
      userId,
      subjectId,
      questionId: dto.questionId ?? null,
      questionText: dto.questionText,
      category: dto.category ?? null,
      interactionType: dto.interactionType,
      note: dto.note ?? null,
    });

    const savedInteraction = await this.interactionsRepository.save(interaction);
    await this.appEventsService.emit({
      userId,
      name: 'question.interaction_recorded',
      subjectId,
      payload: {
        questionId: savedInteraction.questionId,
        category: savedInteraction.category,
        interactionType: savedInteraction.interactionType,
        hasNote: Boolean(savedInteraction.note),
      },
    });

    return savedInteraction;
  }
}
