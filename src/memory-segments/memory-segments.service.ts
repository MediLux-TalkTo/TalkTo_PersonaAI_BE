import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { Recording } from '../recordings/recording.entity';
import { AudioStorageService } from '../storage/audio-storage.service';
import { AppEventsService } from '../events/events.service';
import { CreateMemorySegmentFeedbackDto } from './dto/memory-segment-feedback.dto';
import { CreateMemorySegmentPlaybackDto } from './dto/memory-segment-playback.dto';
import { MemorySegmentPlaybackDto } from './dto/memory-segment-response.dto';
import { MemorySegmentFeedback } from './memory-segment-feedback.entity';

const DEFAULT_SEGMENT_BUFFER_MS = 3000;

@Injectable()
export class MemorySegmentsService {
  constructor(
    @InjectRepository(MemorySegment)
    private readonly memorySegmentsRepository: Repository<MemorySegment>,
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @InjectRepository(MemorySegmentFeedback)
    private readonly feedbackRepository: Repository<MemorySegmentFeedback>,
    private readonly audioStorageService: AudioStorageService,
    private readonly auditService: AuditService,
    private readonly appEventsService: AppEventsService,
  ) {}

  async createPlaybackUrl(
    memorySegmentId: string,
    ownerUserId: string,
    dto: CreateMemorySegmentPlaybackDto,
  ): Promise<MemorySegmentPlaybackDto> {
    const segment = await this.loadOwnedSegment(memorySegmentId, ownerUserId);
    const recording = await this.recordingsRepository.findOne({
      where: {
        id: segment.recordingId,
        ownerUserId,
      },
    });

    if (!recording?.storageKey) {
      throw new NotFoundException('Memory segment recording was not found.');
    }

    const bufferMs = dto.bufferMs ?? DEFAULT_SEGMENT_BUFFER_MS;
    const segmentStartMs = Math.max(0, segment.startMs - bufferMs);
    const segmentEndMs = segment.endMs + bufferMs;
    const playback = await this.audioStorageService.createPlaybackUrl(
      recording.storageKey,
    );

    await this.auditService.recordSensitiveRead({
      actorUserId: ownerUserId,
      resourceType: 'memory_segment',
      resourceId: segment.id,
      subjectId: segment.subjectId,
      metadata: {
        recordingId: segment.recordingId,
        startMs: segmentStartMs,
        endMs: segmentEndMs,
      },
    });
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'memory_segment_playback_requested',
      subjectId: segment.subjectId,
      recordingId: segment.recordingId,
      payload: {
        memorySegmentId: segment.id,
        startMs: segmentStartMs,
        endMs: segmentEndMs,
      },
    });

    return {
      playbackUrl: withMediaFragment(
        playback.playbackUrl,
        segmentStartMs,
        segmentEndMs,
      ),
      expiresAt: playback.expiresAt.toISOString(),
      ttlSeconds: playback.ttlSeconds,
      downloadAllowed: playback.downloadAllowed,
      segmentStartMs,
      segmentEndMs,
      bufferMs,
    };
  }

  async createFeedback(
    memorySegmentId: string,
    ownerUserId: string,
    dto: CreateMemorySegmentFeedbackDto,
  ): Promise<MemorySegmentFeedback> {
    const segment = await this.loadOwnedSegment(memorySegmentId, ownerUserId);
    let feedback = await this.feedbackRepository.findOne({
      where: { memorySegmentId, userId: ownerUserId },
    });

    if (!feedback) {
      feedback = this.feedbackRepository.create({
        memorySegmentId,
        userId: ownerUserId,
        rating: dto.rating,
        tags: dto.tags ?? [],
        comment: dto.comment ?? null,
        reportedStartMs: dto.reportedStartMs ?? null,
        reportedEndMs: dto.reportedEndMs ?? null,
      });
    } else {
      feedback.rating = dto.rating;
      feedback.tags = dto.tags ?? [];
      feedback.comment = dto.comment ?? null;
      feedback.reportedStartMs = dto.reportedStartMs ?? null;
      feedback.reportedEndMs = dto.reportedEndMs ?? null;
    }

    const savedFeedback = await this.feedbackRepository.save(feedback);
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'memory_segment_feedback_submitted',
      subjectId: segment.subjectId,
      recordingId: segment.recordingId,
      payload: {
        memorySegmentId: segment.id,
        rating: dto.rating,
        tags: dto.tags ?? [],
        hasTimestampIssue:
          dto.reportedStartMs !== undefined || dto.reportedEndMs !== undefined,
      },
    });

    return savedFeedback;
  }

  private async loadOwnedSegment(
    memorySegmentId: string,
    ownerUserId: string,
  ): Promise<MemorySegment> {
    const segment = await this.memorySegmentsRepository.findOne({
      where: {
        id: memorySegmentId,
        ownerUserId,
      },
    });

    if (!segment) {
      throw new NotFoundException('Memory segment not found.');
    }

    return segment;
  }
}

function withMediaFragment(
  playbackUrl: string,
  startMs: number,
  endMs: number,
): string {
  const baseUrl = playbackUrl.split('#')[0];
  const startSeconds = Math.round(startMs / 100) / 10;
  const endSeconds = Math.round(endMs / 100) / 10;

  return `${baseUrl}#t=${startSeconds},${endSeconds}`;
}
