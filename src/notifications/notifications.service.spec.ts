import { NotFoundException } from '@nestjs/common';
import { AnalysisJobStatus } from '../analysis/analysis-job.constants';
import { AnalysisJob } from '../analysis/analysis-job.entity';
import { NotificationType } from './notification.constants';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const notificationsRepository = {
    create: jest.fn((input) => input),
    save: jest.fn((input) => Promise.resolve({ id: 'notification-id', ...input })),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.resetAllMocks();
    notificationsRepository.create.mockImplementation((input) => input);
    notificationsRepository.save.mockImplementation((input) =>
      Promise.resolve({ id: 'notification-id', ...input }),
    );
    service = new NotificationsService(notificationsRepository as never);
  });

  it('creates sanitized analysis completed notifications', async () => {
    await expect(service.notifyAnalysisCompleted(buildJob())).resolves.toMatchObject({
      id: 'notification-id',
      userId: 'user-id',
      type: NotificationType.ANALYSIS_COMPLETED,
      resourceType: 'analysis_job',
      resourceId: 'job-id',
      subjectId: 'subject-id',
      recordingId: 'recording-id',
      payload: {
        status: AnalysisJobStatus.COMPLETED,
        retryCount: 0,
      },
    });

    expect(notificationsRepository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        transcriptText: expect.any(String),
      }),
    );
  });

  it('lists unread notifications for the authenticated user', async () => {
    notificationsRepository.find.mockResolvedValue([buildNotification()]);

    await expect(
      service.listForUser('user-id', { limit: 10, unreadOnly: true }),
    ).resolves.toHaveLength(1);

    expect(notificationsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-id' }),
        take: 10,
      }),
    );
  });

  it('marks an owned notification as read', async () => {
    const notification = buildNotification();
    notificationsRepository.findOne.mockResolvedValue(notification);

    await expect(
      service.markRead('user-id', 'notification-id'),
    ).resolves.toMatchObject({
      id: 'notification-id',
      readAt: expect.any(Date),
    });
  });

  it('does not disclose another user notification', async () => {
    notificationsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.markRead('user-id', 'notification-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function buildJob(): AnalysisJob {
  const job = new AnalysisJob();
  job.id = 'job-id';
  job.ownerUserId = 'user-id';
  job.subjectId = 'subject-id';
  job.recordingId = 'recording-id';
  job.status = AnalysisJobStatus.COMPLETED;
  job.retryCount = 0;
  return job;
}

function buildNotification(): Notification {
  const notification = new Notification();
  notification.id = 'notification-id';
  notification.userId = 'user-id';
  notification.type = NotificationType.ANALYSIS_COMPLETED;
  notification.title = 'Ready';
  notification.body = 'Done';
  notification.resourceType = 'analysis_job';
  notification.resourceId = 'job-id';
  notification.subjectId = 'subject-id';
  notification.recordingId = 'recording-id';
  notification.payload = {};
  notification.readAt = null;
  notification.createdAt = new Date('2026-06-18T00:00:00.000Z');
  return notification;
}
