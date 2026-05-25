import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { FeedbackRating } from '../common/enums/feedback.enum';
import { Conversation } from '../conversations/conversation.entity';
import { Message } from '../conversations/message.entity';
import { VoiceArtifact } from '../conversations/voice-artifact.entity';
import { Feedback } from '../feedback/feedback.entity';
import { User } from '../users/user.entity';
import { AdminService } from './admin.service';
import { SystemLog } from './system-log.entity';

describe('AdminService', () => {
  const repository = () => ({
    count: jest.fn(),
    create: jest.fn((value) => value),
    find: jest.fn(),
    save: jest.fn(),
  });

  let service: AdminService;
  let usersRepository: ReturnType<typeof repository>;
  let conversationsRepository: ReturnType<typeof repository>;
  let messagesRepository: ReturnType<typeof repository>;
  let voiceArtifactsRepository: ReturnType<typeof repository>;
  let feedbackRepository: ReturnType<typeof repository>;

  beforeEach(async () => {
    usersRepository = repository();
    conversationsRepository = repository();
    messagesRepository = repository();
    voiceArtifactsRepository = repository();
    feedbackRepository = repository();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(SystemLog), useValue: repository() },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Conversation), useValue: conversationsRepository },
        { provide: getRepositoryToken(Message), useValue: messagesRepository },
        { provide: getRepositoryToken(VoiceArtifact), useValue: voiceArtifactsRepository },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepository },
      ],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  it('counts negative feedback by tag sorted by count', async () => {
    feedbackRepository.find.mockResolvedValue([
      { tags: ['사실이 틀렸어요', '목소리가 어색해요'] },
      { tags: ['사실이 틀렸어요'] },
      { tags: ['기억에 없는 말을 지어냈어요'] },
    ]);

    await expect(service.getNegativeFeedbackSummary()).resolves.toEqual([
      { tag: '사실이 틀렸어요', count: 2 },
      { tag: '기억에 없는 말을 지어냈어요', count: 1 },
      { tag: '목소리가 어색해요', count: 1 },
    ]);
    expect(feedbackRepository.find).toHaveBeenCalledWith({
      select: {
        id: true,
        tags: true,
      },
      where: {
        rating: FeedbackRating.DOWN,
      },
    });
  });

  it('includes neutral feedback in overview ratios', async () => {
    usersRepository.count.mockResolvedValue(10);
    conversationsRepository.count.mockResolvedValue(20);
    messagesRepository.count.mockResolvedValue(30);
    voiceArtifactsRepository.count.mockResolvedValue(40);
    feedbackRepository.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);

    await expect(service.getMetricsOverview()).resolves.toMatchObject({
      usersTotal: 10,
      conversationsTotal: 20,
      messagesTotal: 30,
      voiceMessagesTotal: 40,
      feedbackPositiveRatio: 8 / 12,
      feedbackNeutralRatio: 2 / 12,
      feedbackNegativeRatio: 2 / 12,
    });
    expect(feedbackRepository.count).toHaveBeenNthCalledWith(1, {
      where: { rating: FeedbackRating.UP },
    });
    expect(feedbackRepository.count).toHaveBeenNthCalledWith(2, {
      where: { rating: FeedbackRating.NEUTRAL },
    });
    expect(feedbackRepository.count).toHaveBeenNthCalledWith(3, {
      where: { rating: FeedbackRating.DOWN },
    });
  });

  it('returns review rows without exposing user contact fields', async () => {
    feedbackRepository.find.mockResolvedValue([
      {
        id: 'feedback-id',
        createdAt: new Date('2026-04-29T05:23:00.000Z'),
        messageId: 'message-id',
        userId: 'user-id',
        rating: FeedbackRating.UP,
        tags: ['할머니 같았어요'],
        comment: '정말 할머니 목소리 같았어요.',
        message: {
          conversationId: 'conversation-id',
          content: '어. 잘 있었어?',
        },
        user: {
          id: 'user-id',
          name: '홍길동',
          email: 'hidden@example.com',
          phoneNumber: '01000000000',
        },
      },
    ]);

    await expect(
      service.getFeedbackReviews({ rating: FeedbackRating.UP, limit: 10 }),
    ).resolves.toEqual([
      {
        id: 'feedback-id',
        createdAt: '2026-04-29T05:23:00.000Z',
        sessionId: 'conversation-id',
        messageId: 'message-id',
        rating: FeedbackRating.UP,
        tags: ['할머니 같았어요'],
        comment: '정말 할머니 목소리 같았어요.',
        messageContent: '어. 잘 있었어?',
        userId: 'user-id',
        userName: '홍길동',
      },
    ]);
    expect(feedbackRepository.find).toHaveBeenCalledWith({
      where: { rating: FeedbackRating.UP },
      relations: {
        message: {
          conversation: true,
        },
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 10,
    });
  });
});
