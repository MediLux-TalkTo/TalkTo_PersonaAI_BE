import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, MoreThanOrEqual, LessThanOrEqual, Repository } from 'typeorm';
import { FeedbackRating } from '../common/enums/feedback.enum';
import { MessageInputMode, MessageSenderType } from '../common/enums/message.enums';
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
    private readonly dataSource: DataSource,
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

  async getDailyMetrics() {
    const days = 14;
    const timeZone = 'Asia/Seoul';
    const rows = await this.dataSource.query<
      {
        date: string;
        new_users: string;
        conversation_sessions: string;
        messages: string;
        voice_messages: string;
        assistant_messages: string;
        feedback_positive: string;
        feedback_neutral: string;
        feedback_negative: string;
        feedback_total: string;
      }[]
    >(
      `
        WITH days AS (
          SELECT generate_series(
            (date_trunc('day', timezone($1, now()))::date - ($2::int - 1)),
            date_trunc('day', timezone($1, now()))::date,
            interval '1 day'
          )::date AS day
        ),
        users_daily AS (
          SELECT timezone($1, "createdAt")::date AS day, count(*)::int AS count
          FROM "users"
          GROUP BY 1
        ),
        conversations_daily AS (
          SELECT timezone($1, "startedAt")::date AS day, count(*)::int AS count
          FROM "conversations"
          GROUP BY 1
        ),
        messages_daily AS (
          SELECT
            timezone($1, "createdAt")::date AS day,
            count(*)::int AS messages,
            count(*) FILTER (WHERE "inputMode" = $3)::int AS voice_messages,
            count(*) FILTER (WHERE "senderType" = $4)::int AS assistant_messages
          FROM "messages"
          GROUP BY 1
        ),
        feedback_daily AS (
          SELECT
            timezone($1, "createdAt")::date AS day,
            count(*) FILTER (WHERE "rating" = $5)::int AS feedback_positive,
            count(*) FILTER (WHERE "rating" = $6)::int AS feedback_neutral,
            count(*) FILTER (WHERE "rating" = $7)::int AS feedback_negative,
            count(*)::int AS feedback_total
          FROM "feedbacks"
          GROUP BY 1
        )
        SELECT
          to_char(days.day, 'YYYY-MM-DD') AS date,
          coalesce(users_daily.count, 0)::int AS new_users,
          coalesce(conversations_daily.count, 0)::int AS conversation_sessions,
          coalesce(messages_daily.messages, 0)::int AS messages,
          coalesce(messages_daily.voice_messages, 0)::int AS voice_messages,
          coalesce(messages_daily.assistant_messages, 0)::int AS assistant_messages,
          coalesce(feedback_daily.feedback_positive, 0)::int AS feedback_positive,
          coalesce(feedback_daily.feedback_neutral, 0)::int AS feedback_neutral,
          coalesce(feedback_daily.feedback_negative, 0)::int AS feedback_negative,
          coalesce(feedback_daily.feedback_total, 0)::int AS feedback_total
        FROM days
        LEFT JOIN users_daily ON users_daily.day = days.day
        LEFT JOIN conversations_daily ON conversations_daily.day = days.day
        LEFT JOIN messages_daily ON messages_daily.day = days.day
        LEFT JOIN feedback_daily ON feedback_daily.day = days.day
        ORDER BY days.day ASC
      `,
      [
        timeZone,
        days,
        MessageInputMode.VOICE,
        MessageSenderType.ASSISTANT,
        FeedbackRating.UP,
        FeedbackRating.NEUTRAL,
        FeedbackRating.DOWN,
      ],
    );

    return {
      timeZone,
      days,
      items: rows.map((row) => {
        const assistantMessages = Number(row.assistant_messages);
        const feedbackTotal = Number(row.feedback_total);

        return {
          date: row.date,
          newUsers: Number(row.new_users),
          conversationSessions: Number(row.conversation_sessions),
          messages: Number(row.messages),
          voiceMessages: Number(row.voice_messages),
          assistantMessages,
          feedbackPositive: Number(row.feedback_positive),
          feedbackNeutral: Number(row.feedback_neutral),
          feedbackNegative: Number(row.feedback_negative),
          feedbackTotal,
          feedbackResponseRate:
            assistantMessages === 0 ? 0 : feedbackTotal / assistantMessages,
        };
      }),
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
