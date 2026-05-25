import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, LessThanOrEqual, Repository } from 'typeorm';
import { FeedbackRating } from '../common/enums/feedback.enum';
import { sanitizeForLog } from '../common/utils/sanitize.util';
import { QueryErrorLogsDto } from './dto/query-error-logs.dto';
import { SystemLog } from './system-log.entity';
import { User } from '../users/user.entity';
import { Conversation } from '../conversations/conversation.entity';
import { Message } from '../conversations/message.entity';
import { VoiceArtifact } from '../conversations/voice-artifact.entity';
import { Feedback } from '../feedback/feedback.entity';
import { QueryFeedbackReviewsDto } from './dto/query-feedback-reviews.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SystemLog)
    private readonly logsRepository: Repository<SystemLog>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(VoiceArtifact)
    private readonly voiceArtifactsRepository: Repository<VoiceArtifact>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  async getMetricsOverview() {
    const [
      usersTotal,
      conversationsTotal,
      messagesTotal,
      voiceMessagesTotal,
      positiveFeedbackCount,
      neutralFeedbackCount,
      negativeFeedbackCount,
    ] = await Promise.all([
      this.usersRepository.count(),
      this.conversationsRepository.count(),
      this.messagesRepository.count(),
      this.voiceArtifactsRepository.count(),
      this.feedbackRepository.count({ where: { rating: FeedbackRating.UP } }),
      this.feedbackRepository.count({ where: { rating: FeedbackRating.NEUTRAL } }),
      this.feedbackRepository.count({ where: { rating: FeedbackRating.DOWN } }),
    ]);

    const feedbackTotal = positiveFeedbackCount + neutralFeedbackCount + negativeFeedbackCount;

    return {
      usersTotal,
      conversationsTotal,
      messagesTotal,
      voiceMessagesTotal,
      feedbackPositiveRatio:
        feedbackTotal === 0 ? 0 : positiveFeedbackCount / feedbackTotal,
      feedbackNeutralRatio:
        feedbackTotal === 0 ? 0 : neutralFeedbackCount / feedbackTotal,
      feedbackNegativeRatio:
        feedbackTotal === 0 ? 0 : negativeFeedbackCount / feedbackTotal,
    };
  }

  async getNegativeFeedbackSummary() {
    const feedbacks = await this.feedbackRepository.find({
      select: {
        id: true,
        tags: true,
      },
      where: {
        rating: FeedbackRating.DOWN,
      },
    });

    const counts = new Map<string, number>();

    for (const feedback of feedbacks) {
      for (const tag of feedback.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
  }

  async getFeedbackReviews(dto: QueryFeedbackReviewsDto) {
    const feedbacks = await this.feedbackRepository.find({
      where: dto.rating ? { rating: dto.rating } : {},
      relations: {
        message: {
          conversation: true,
        },
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: dto.limit ?? 50,
    });

    return feedbacks.map((feedback) => ({
      id: feedback.id,
      createdAt: feedback.createdAt.toISOString(),
      sessionId: feedback.message.conversationId,
      messageId: feedback.messageId,
      rating: feedback.rating,
      tags: feedback.tags,
      comment: feedback.comment,
      messageContent: feedback.message.content,
      userId: feedback.userId,
      userName: feedback.user.name,
    }));
  }

  async getErrorLogs(dto: QueryErrorLogsDto) {
    const where: Record<string, unknown> = {};

    if (dto.category) {
      where.category = dto.category;
    }

    if (dto.severity) {
      where.severity = dto.severity;
    }

    if (dto.from && dto.to) {
      where.occurredAt = Between(new Date(dto.from), new Date(dto.to));
    } else if (dto.from) {
      where.occurredAt = MoreThanOrEqual(new Date(dto.from));
    } else if (dto.to) {
      where.occurredAt = LessThanOrEqual(new Date(dto.to));
    }

    return this.logsRepository.find({
      where,
      order: {
        occurredAt: 'DESC',
      },
      take: 100,
    });
  }

  async recordLog(payload: Partial<SystemLog>) {
    const log = this.logsRepository.create({
      category: payload.category,
      severity: payload.severity,
      conversationId: payload.conversationId ?? null,
      messageId: payload.messageId ?? null,
      detail: sanitizeForLog(payload.detail ?? {}) as Record<string, unknown>,
    });

    await this.logsRepository.save(log);
  }
}
