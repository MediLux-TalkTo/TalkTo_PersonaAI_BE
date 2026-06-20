import { NotFoundException } from '@nestjs/common';
import { FeedbackRating } from '../common/enums/feedback.enum';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { MemorySegmentsService } from './memory-segments.service';

describe('MemorySegmentsService', () => {
  const memorySegmentsRepository = {
    findOne: jest.fn(),
  };
  const recordingsRepository = {
    findOne: jest.fn(),
  };
  const feedbackRepository = {
    findOne: jest.fn(),
    create: jest.fn((input) => input),
    save: jest.fn((input) => Promise.resolve({ id: 'feedback-id', ...input })),
  };
  const audioStorageService = {
    createPlaybackUrl: jest.fn(),
  };
  const auditService = {
    recordSensitiveRead: jest.fn(),
  };
  const appEventsService = {
    emit: jest.fn(),
  };
  let service: MemorySegmentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    feedbackRepository.create.mockImplementation((input) => input);
    feedbackRepository.save.mockImplementation((input) =>
      Promise.resolve({ id: 'feedback-id', ...input }),
    );
    service = new MemorySegmentsService(
      memorySegmentsRepository as never,
      recordingsRepository as never,
      feedbackRepository as never,
      audioStorageService as never,
      auditService as never,
      appEventsService as never,
    );
  });

  it('issues a segment-scoped playback URL and records audit/event metadata', async () => {
    memorySegmentsRepository.findOne.mockResolvedValue(buildSegment());
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
    });
    audioStorageService.createPlaybackUrl.mockResolvedValue({
      playbackUrl: '/audio/recordings/user-id/subject-id/recording-id.m4a',
      expiresAt: new Date('2026-06-18T00:00:00.000Z'),
      ttlSeconds: 3600,
      downloadAllowed: false,
    });

    await expect(
      service.createPlaybackUrl('segment-id', 'user-id', { bufferMs: 2000 }),
    ).resolves.toEqual({
      playbackUrl: '/audio/recordings/user-id/subject-id/recording-id.m4a#t=8,32',
      expiresAt: '2026-06-18T00:00:00.000Z',
      ttlSeconds: 3600,
      downloadAllowed: false,
      segmentStartMs: 8000,
      segmentEndMs: 32000,
      bufferMs: 2000,
    });

    expect(auditService.recordSensitiveRead).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-id',
        resourceType: 'memory_segment',
        resourceId: 'segment-id',
        subjectId: 'subject-id',
      }),
    );
    expect(appEventsService.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        name: 'memory_segment_playback_requested',
        recordingId: 'recording-id',
      }),
    );
  });

  it('does not disclose segments owned by another user', async () => {
    memorySegmentsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createPlaybackUrl('segment-id', 'user-id', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audioStorageService.createPlaybackUrl).not.toHaveBeenCalled();
  });

  it('upserts feedback for an owned memory segment', async () => {
    memorySegmentsRepository.findOne.mockResolvedValue(buildSegment());
    feedbackRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createFeedback('segment-id', 'user-id', {
        rating: FeedbackRating.DOWN,
        tags: ['timestamp_issue'],
        comment: 'Starts late',
        reportedStartMs: 12000,
      }),
    ).resolves.toMatchObject({
      id: 'feedback-id',
      memorySegmentId: 'segment-id',
      userId: 'user-id',
      rating: FeedbackRating.DOWN,
      tags: ['timestamp_issue'],
      comment: 'Starts late',
      reportedStartMs: 12000,
      reportedEndMs: null,
    });
    expect(feedbackRepository.save).toHaveBeenCalled();
    expect(appEventsService.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'memory_segment_feedback_submitted',
        payload: expect.objectContaining({ hasTimestampIssue: true }),
      }),
    );
  });
});

function buildSegment(): MemorySegment {
  const segment = new MemorySegment();
  segment.id = 'segment-id';
  segment.ownerUserId = 'user-id';
  segment.subjectId = 'subject-id';
  segment.recordingId = 'recording-id';
  segment.startMs = 10000;
  segment.endMs = 30000;
  return segment;
}
