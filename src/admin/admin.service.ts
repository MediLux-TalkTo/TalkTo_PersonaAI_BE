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
      negativeFeedbackCount,
    ] = await Promise.all([
      this.usersRepository.count(),
      this.conversationsRepository.count(),
      this.messagesRepository.count(),
      this.voiceArtifactsRepository.count(),
      this.feedbackRepository.count({ where: { rating: FeedbackRating.UP } }),
      this.feedbackRepository.count({ where: { rating: FeedbackRating.DOWN } }),
    ]);

    const feedbackTotal = positiveFeedbackCount + negativeFeedbackCount;

    return {
      usersTotal,
      conversationsTotal,
      messagesTotal,
      voiceMessagesTotal,
      feedbackPositiveRatio:
        feedbackTotal === 0 ? 0 : positiveFeedbackCount / feedbackTotal,
      feedbackNegativeRatio:
        feedbackTotal === 0 ? 0 : negativeFeedbackCount / feedbackTotal,
    };
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
