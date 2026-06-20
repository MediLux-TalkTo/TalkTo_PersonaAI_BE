import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AnalysisJob } from '../analysis/analysis-job.entity';
import { sanitizeForAuditMetadata } from '../common/utils/sanitize.util';
import { NotificationType } from './notification.constants';
import { Notification } from './notification.entity';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

export type CreateNotificationInput = {
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly resourceType?: string | null;
  readonly resourceId?: string | null;
  readonly subjectId?: string | null;
  readonly recordingId?: string | null;
  readonly payload?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId: input.userId,
      type: input.type,
      title: truncate(input.title, 160),
      body: truncate(input.body, 300),
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      subjectId: input.subjectId ?? null,
      recordingId: input.recordingId ?? null,
      payload: sanitizeForAuditMetadata(input.payload),
      readAt: null,
    });

    return this.notificationsRepository.save(notification);
  }

  async notifyAnalysisCompleted(job: AnalysisJob): Promise<Notification> {
    return this.create({
      userId: job.ownerUserId,
      type: NotificationType.ANALYSIS_COMPLETED,
      title: 'Memories analysis is ready',
      body: 'A paid Memories analysis job has completed.',
      resourceType: 'analysis_job',
      resourceId: job.id,
      subjectId: job.subjectId,
      recordingId: job.recordingId,
      payload: {
        status: job.status,
        retryCount: job.retryCount,
      },
    });
  }

  async notifyAnalysisFailed(job: AnalysisJob): Promise<Notification> {
    return this.create({
      userId: job.ownerUserId,
      type: NotificationType.ANALYSIS_FAILED,
      title: 'Memories analysis needs attention',
      body: 'A paid Memories analysis job failed before completion.',
      resourceType: 'analysis_job',
      resourceId: job.id,
      subjectId: job.subjectId,
      recordingId: job.recordingId,
      payload: {
        status: job.status,
        failureCode: job.failureCode,
        retryCount: job.retryCount,
      },
    });
  }

  async listForUser(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: {
        userId,
        ...(query.unreadOnly ? { readAt: IsNull() } : {}),
      },
      order: { createdAt: 'DESC' },
      take: query.limit ?? 50,
    });
  }

  async markRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    notification.readAt ??= new Date();
    return this.notificationsRepository.save(notification);
  }
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}
