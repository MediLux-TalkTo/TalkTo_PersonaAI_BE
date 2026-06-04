import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../common/enums/archive.enums';
import { AudioStorageService } from '../storage/audio-storage.service';
import { SubjectsService } from '../subjects/subjects.service';
import { CompleteRecordingUploadDto } from './dto/complete-recording-upload.dto';
import { CreateRecordingUploadIntentDto } from './dto/create-upload-intent.dto';
import { Recording } from './recording.entity';

const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/amr',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
  'audio/x-wav',
]);

@Injectable()
export class RecordingsService {
  constructor(
    private readonly subjectsService: SubjectsService,
    private readonly audioStorageService: AudioStorageService,
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
  ) {}

  async createUploadIntent(ownerUserId: string, dto: CreateRecordingUploadIntentDto) {
    await this.subjectsService.getOwned(dto.subjectId, ownerUserId);
    this.assertSupportedMimeType(dto.mimeType);

    const recording = this.recordingsRepository.create({
      ownerUserId,
      subjectId: dto.subjectId,
      originalFilename: dto.originalFilename,
      mimeType: dto.mimeType,
      fileSizeBytes: String(dto.fileSizeBytes),
      durationSeconds: dto.durationSeconds ?? null,
      memo: dto.memo ?? null,
      relatedQuestionId: dto.relatedQuestionId ?? null,
      relatedQuestionText: dto.relatedQuestionText ?? null,
      fileHash: dto.fileHash ?? null,
      uploadStatus: RecordingUploadStatus.UPLOADING,
      analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
      storageKey: null,
      uploadedAt: null,
    });
    const savedRecording = await this.recordingsRepository.save(recording);
    const uploadIntent = await this.audioStorageService.createUploadIntent({
      ownerUserId,
      subjectId: dto.subjectId,
      recordingId: savedRecording.id,
      filename: dto.originalFilename,
      contentType: dto.mimeType,
    });

    savedRecording.storageKey = uploadIntent.storageKey;
    await this.recordingsRepository.save(savedRecording);

    return {
      recording: savedRecording,
      method: uploadIntent.method,
      uploadUrl: uploadIntent.uploadUrl,
      storageKey: uploadIntent.storageKey,
      expiresAt: uploadIntent.expiresAt,
    };
  }

  async completeUpload(
    recordingId: string,
    ownerUserId: string,
    dto: CompleteRecordingUploadDto,
  ): Promise<Recording> {
    const recording = await this.getOwned(recordingId, ownerUserId);

    if (!recording.storageKey) {
      throw new BadRequestException('Recording upload intent is missing storage key.');
    }

    recording.uploadStatus = RecordingUploadStatus.UPLOADED;
    recording.uploadedAt = new Date();
    recording.fileHash = dto.fileHash ?? recording.fileHash;

    return this.recordingsRepository.save(recording);
  }

  async listBySubject(subjectId: string, ownerUserId: string): Promise<Recording[]> {
    await this.subjectsService.getOwned(subjectId, ownerUserId);

    return this.recordingsRepository.find({
      where: { subjectId, ownerUserId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOwned(recordingId: string, ownerUserId: string): Promise<Recording> {
    const recording = await this.recordingsRepository.findOne({
      where: { id: recordingId, ownerUserId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }

    return recording;
  }

  async createPlaybackUrl(recordingId: string, ownerUserId: string) {
    const recording = await this.getOwned(recordingId, ownerUserId);

    if (
      recording.uploadStatus !== RecordingUploadStatus.UPLOADED ||
      !recording.storageKey
    ) {
      throw new BadRequestException('Recording is not uploaded.');
    }

    return this.audioStorageService.createPlaybackUrl(recording.storageKey);
  }

  private assertSupportedMimeType(mimeType: string) {
    if (!SUPPORTED_AUDIO_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`Unsupported audio MIME type: ${mimeType}.`);
    }
  }
}
