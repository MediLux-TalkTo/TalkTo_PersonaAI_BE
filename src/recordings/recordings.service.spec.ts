import { BadRequestException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../common/enums/archive.enums';
import { ConsentFeature } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { AudioStorageService } from '../storage/audio-storage.service';
import { SubjectsService } from '../subjects/subjects.service';
import { Recording } from './recording.entity';
import { RecordingUploadIntent } from './recording-upload-intent.entity';
import { RecordingsService } from './recordings.service';
import {
  RecordingUploadFailureCode,
  RecordingUploadIntentStatus,
} from './upload-intent.constants';

const UPLOAD_EXPIRES_AT = new Date('2099-07-05T00:00:00.000Z');
const PLAYBACK_EXPIRES_AT = new Date('2099-07-05T01:00:00.000Z');

describe('RecordingsService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ ...value, id: value.id ?? 'recording-id' })),
  });

  let service: RecordingsService;
  let recordingsRepository: ReturnType<typeof repository>;
  let uploadIntentsRepository: ReturnType<typeof repository>;
  let subjectsService: { getOwned: jest.Mock };
  let consentsService: { assertRequiredConsents: jest.Mock };
  let appEventsService: { emit: jest.Mock };
  let audioStorageService: {
    createUploadIntent: jest.Mock;
    createPlaybackUrl: jest.Mock;
    verifyUploadObject: jest.Mock;
  };

  beforeEach(async () => {
    recordingsRepository = repository();
    recordingsRepository.find.mockResolvedValue([]);
    uploadIntentsRepository = repository();
    subjectsService = {
      getOwned: jest.fn().mockResolvedValue({ id: 'subject-id' }),
    };
    consentsService = {
      assertRequiredConsents: jest.fn().mockResolvedValue(undefined),
    };
    appEventsService = { emit: jest.fn().mockResolvedValue(null) };
    audioStorageService = {
      createUploadIntent: jest.fn().mockResolvedValue({
        storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
        uploadUrl: 'https://upload.example',
        expiresAt: UPLOAD_EXPIRES_AT,
        method: 'PUT',
      }),
      createPlaybackUrl: jest.fn().mockResolvedValue({
        playbackUrl: 'https://playback.example',
        expiresAt: PLAYBACK_EXPIRES_AT,
        ttlSeconds: 3600,
      }),
      verifyUploadObject: jest.fn().mockResolvedValue({
        exists: true,
        sizeBytes: 1024,
        checksumStatus: 'not_supported',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RecordingsService,
        { provide: getRepositoryToken(Recording), useValue: recordingsRepository },
        {
          provide: getRepositoryToken(RecordingUploadIntent),
          useValue: uploadIntentsRepository,
        },
        { provide: SubjectsService, useValue: subjectsService },
        { provide: AudioStorageService, useValue: audioStorageService },
        { provide: ConsentsService, useValue: consentsService },
        { provide: AppEventsService, useValue: appEventsService },
      ],
    }).compile();

    service = moduleRef.get(RecordingsService);
  });

  it('creates upload intent after validating subject ownership and audio type', async () => {
    const result = await service.createUploadIntent('user-id', {
      subjectId: 'subject-id',
      originalFilename: 'call.m4a',
      mimeType: 'audio/mp4',
      fileSizeBytes: 1024,
    });

    expect(subjectsService.getOwned).toHaveBeenCalledWith('subject-id', 'user-id');
    expect(recordingsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadStatus: RecordingUploadStatus.UPLOADING,
        analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
        archiveStatus: 'pending_upload',
        analysisStage: 'not_analyzed',
        memoriesStatus: 'locked_until_memories',
      }),
    );
    expect(uploadIntentsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recordingId: 'recording-id',
        status: RecordingUploadIntentStatus.UPLOADING,
        failureCode: null,
        source: 'app_recording',
        platform: 'ios',
        singleFile: true,
      }),
    );
    expect(audioStorageService.createUploadIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
        recordingId: 'recording-id',
      }),
    );
    expect(result.uploadUrl).toBe('https://upload.example');
    expect(appEventsService.emit).toHaveBeenCalledWith({
      userId: 'user-id',
      name: 'recording.upload_intent_created',
      subjectId: 'subject-id',
      recordingId: 'recording-id',
      payload: {
        mimeType: 'audio/mp4',
        fileSizeBytes: 1024,
        hasDuration: false,
        hasMemo: false,
        hasRelatedQuestionId: false,
        uploadMethod: 'PUT',
        expiresAt: UPLOAD_EXPIRES_AT,
      },
    });
    expect(JSON.stringify(appEventsService.emit.mock.calls[0][0])).not.toContain(
      'upload.example',
    );
  });

  it('initializes free Archive uploads without transcript, summary, embedding, Preview, or job side effects', async () => {
    await service.createUploadIntent('user-id', {
      subjectId: 'subject-id',
      originalFilename: 'call.m4a',
      mimeType: 'audio/mp4',
      fileSizeBytes: 1024,
    });

    const createdRecording = recordingsRepository.create.mock.calls[0][0];

    expect(createdRecording).toMatchObject({
      analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
    });
    expect(createdRecording).not.toHaveProperty('transcript');
    expect(createdRecording).not.toHaveProperty('summary');
    expect(createdRecording).not.toHaveProperty('embedding');
    expect(createdRecording).not.toHaveProperty('previewStatus');
    expect(createdRecording).not.toHaveProperty('analysisJobId');
  });

  it('rejects unsupported upload MIME types', async () => {
    await expect(
      service.createUploadIntent('user-id', {
        subjectId: 'subject-id',
        originalFilename: 'note.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 1024,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects uploads larger than the guide limit with a durable failure code', async () => {
    await expect(
      service.createUploadIntent('user-id', {
        subjectId: 'subject-id',
        originalFilename: 'huge.m4a',
        mimeType: 'audio/mp4',
        fileSizeBytes: 536870913,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: RecordingUploadFailureCode.FILE_TOO_LARGE,
      }),
    });
  });

  it('returns upload guide constraints and lifecycle codes', () => {
    expect(service.getUploadGuide()).toMatchObject({
      maxFileSizeBytes: 536870912,
      singleFileOnly: true,
      supportedMimeTypes: expect.arrayContaining(['audio/mp4']),
      lifecycle: expect.arrayContaining([
        RecordingUploadIntentStatus.UPLOADING,
        RecordingUploadIntentStatus.COMPLETED,
      ]),
      failureCodes: expect.arrayContaining([
        RecordingUploadFailureCode.OBJECT_MISSING,
        RecordingUploadFailureCode.CHECKSUM_MISMATCH,
      ]),
    });
  });

  it('marks upload as completed without requesting free Archive analysis', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      fileSizeBytes: '1024',
      uploadStatus: RecordingUploadStatus.UPLOADING,
      analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
    });
    uploadIntentsRepository.findOne.mockResolvedValue({
      id: 'intent-id',
      recordingId: 'recording-id',
      ownerUserId: 'user-id',
      status: RecordingUploadIntentStatus.UPLOADING,
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      expiresAt: PLAYBACK_EXPIRES_AT,
    });

    await expect(
      service.completeUpload('recording-id', 'user-id', {
        uploadIntentId: 'intent-id',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        upload_status: RecordingUploadStatus.UPLOADED,
        analysis_status: RecordingAnalysisStatus.NOT_REQUESTED,
        archive_status: 'archived',
        analysis_stage: 'not_analyzed',
        memories_status: 'locked_until_memories',
        checksum_status: 'not_supported',
      }),
    );

    const savedRecording = recordingsRepository.save.mock.calls[0][0];
    expect(savedRecording).toMatchObject({
      analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
      archiveStatus: 'archived',
      analysisStage: 'not_analyzed',
      memoriesStatus: 'locked_until_memories',
    });
    expect(uploadIntentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: RecordingUploadIntentStatus.COMPLETED,
        failureCode: null,
      }),
    );
    expect(savedRecording).not.toHaveProperty('transcript');
    expect(savedRecording).not.toHaveProperty('summary');
    expect(savedRecording).not.toHaveProperty('embedding');
    expect(savedRecording).not.toHaveProperty('previewStatus');
    expect(savedRecording).not.toHaveProperty('analysisJobId');
    expect(appEventsService.emit).toHaveBeenCalledWith({
      userId: 'user-id',
      name: 'recording.upload_completed',
      subjectId: 'subject-id',
      recordingId: 'recording-id',
      payload: {
        uploadStatus: RecordingUploadStatus.UPLOADED,
        analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
        checksumStatus: 'not_supported',
        hasFileHash: false,
      },
    });
  });

  it('fails completion when storage object metadata does not match expected size', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      fileSizeBytes: '1024',
      uploadStatus: RecordingUploadStatus.UPLOADING,
      analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
    });
    uploadIntentsRepository.findOne.mockResolvedValue({
      id: 'intent-id',
      recordingId: 'recording-id',
      ownerUserId: 'user-id',
      status: RecordingUploadIntentStatus.UPLOADING,
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      expiresAt: PLAYBACK_EXPIRES_AT,
    });
    audioStorageService.verifyUploadObject.mockResolvedValue({
      exists: true,
      sizeBytes: 2048,
      checksumStatus: 'not_supported',
    });

    await expect(
      service.completeUpload('recording-id', 'user-id', {
        uploadIntentId: 'intent-id',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: RecordingUploadFailureCode.SIZE_MISMATCH,
      }),
    });

    expect(uploadIntentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: RecordingUploadIntentStatus.FAILED,
        failureCode: RecordingUploadFailureCode.SIZE_MISMATCH,
      }),
    );
  });

  it('returns the completed recording when completion is duplicated after success', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
      originalFilename: 'call.m4a',
      mimeType: 'audio/mp4',
      fileSizeBytes: '1024',
      durationSeconds: null,
      uploadStatus: RecordingUploadStatus.UPLOADED,
      analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
      archiveStatus: 'archived',
      analysisStage: 'not_analyzed',
      memoriesStatus: 'locked_until_memories',
      checksumStatus: 'not_supported',
      memo: null,
      relatedQuestionId: null,
      relatedQuestionText: null,
      uploadedAt: new Date('2026-07-05T01:00:00.000Z'),
      createdAt: new Date('2026-07-05T00:00:00.000Z'),
      updatedAt: new Date('2026-07-05T01:00:00.000Z'),
      deletedAt: null,
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
    });
    uploadIntentsRepository.findOne.mockResolvedValue({
      id: 'intent-id',
      recordingId: 'recording-id',
      ownerUserId: 'user-id',
      status: RecordingUploadIntentStatus.COMPLETED,
      failureCode: null,
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      expiresAt: new Date('2026-07-05T01:00:00.000Z'),
    });

    await expect(
      service.completeUpload('recording-id', 'user-id', {
        uploadIntentId: 'intent-id',
      }),
    ).resolves.toMatchObject({
      id: 'recording-id',
      upload_status: RecordingUploadStatus.UPLOADED,
      archive_status: 'archived',
    });
    expect(audioStorageService.verifyUploadObject).not.toHaveBeenCalled();
    expect(recordingsRepository.save).not.toHaveBeenCalled();
    expect(uploadIntentsRepository.save).not.toHaveBeenCalled();
  });

  it('rejects completion after cancellation without changing terminal state', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      fileSizeBytes: '1024',
      uploadStatus: RecordingUploadStatus.UPLOAD_FAILED,
      analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
    });
    uploadIntentsRepository.findOne.mockResolvedValue({
      id: 'intent-id',
      recordingId: 'recording-id',
      ownerUserId: 'user-id',
      status: RecordingUploadIntentStatus.CANCELED,
      failureCode: RecordingUploadFailureCode.UPLOAD_CANCELED,
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      expiresAt: new Date('2026-07-05T01:00:00.000Z'),
    });

    await expect(
      service.completeUpload('recording-id', 'user-id', {
        uploadIntentId: 'intent-id',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: RecordingUploadFailureCode.UPLOAD_CANCELED,
        status: RecordingUploadIntentStatus.CANCELED,
      }),
    });
    expect(audioStorageService.verifyUploadObject).not.toHaveBeenCalled();
    expect(recordingsRepository.save).not.toHaveBeenCalled();
    expect(uploadIntentsRepository.save).not.toHaveBeenCalled();
  });

  it('cancels an active upload intent without completing the recording', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      uploadStatus: RecordingUploadStatus.UPLOADING,
    });
    uploadIntentsRepository.findOne.mockResolvedValue({
      id: 'intent-id',
      recordingId: 'recording-id',
      ownerUserId: 'user-id',
      status: RecordingUploadIntentStatus.UPLOADING,
    });

    await expect(
      service.cancelUploadIntent('recording-id', 'user-id', 'intent-id'),
    ).resolves.toMatchObject({
      status: RecordingUploadIntentStatus.CANCELED,
      failureCode: RecordingUploadFailureCode.UPLOAD_CANCELED,
    });
    expect(recordingsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadStatus: RecordingUploadStatus.UPLOAD_FAILED,
      }),
    );
  });

  it('returns completed upload intent unchanged when cancellation is requested after completion', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      uploadStatus: RecordingUploadStatus.UPLOADED,
    });
    uploadIntentsRepository.findOne.mockResolvedValue({
      id: 'intent-id',
      recordingId: 'recording-id',
      ownerUserId: 'user-id',
      status: RecordingUploadIntentStatus.COMPLETED,
      failureCode: null,
    });

    await expect(
      service.cancelUploadIntent('recording-id', 'user-id', 'intent-id'),
    ).resolves.toMatchObject({
      status: RecordingUploadIntentStatus.COMPLETED,
      failureCode: null,
    });
    expect(recordingsRepository.save).not.toHaveBeenCalled();
    expect(uploadIntentsRepository.save).not.toHaveBeenCalled();
  });

  it('retries a failed upload intent by issuing a new storage URL', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
      originalFilename: 'call.m4a',
      mimeType: 'audio/mp4',
      fileSizeBytes: '1024',
      uploadStatus: RecordingUploadStatus.UPLOAD_FAILED,
    });
    uploadIntentsRepository.findOne.mockResolvedValue({
      id: 'intent-id',
      recordingId: 'recording-id',
      ownerUserId: 'user-id',
      status: RecordingUploadIntentStatus.FAILED,
      source: 'share_extension',
      platform: 'ios',
      singleFile: true,
    });

    await expect(
      service.retryUploadIntent('recording-id', 'user-id', 'intent-id'),
    ).resolves.toMatchObject({
      recording: expect.objectContaining({
        id: 'recording-id',
        upload_status: RecordingUploadStatus.UPLOADING,
      }),
      method: 'PUT',
      uploadUrl: 'https://upload.example',
    });
    expect(uploadIntentsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: RecordingUploadIntentStatus.UPLOADING,
        source: 'share_extension',
      }),
    );
    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.ARCHIVE,
      'subject-id',
    );
    expect(consentsService.assertRequiredConsents).not.toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.MEMORIES,
      'subject-id',
    );
    expect(recordingsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadStatus: RecordingUploadStatus.UPLOADING,
      }),
    );
  });

  it('issues playback URL for uploaded recordings', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      uploadStatus: RecordingUploadStatus.UPLOADED,
      archiveStatus: 'archived',
    });

    await expect(service.createPlaybackUrl('recording-id', 'user-id')).resolves.toEqual({
      playback_url: 'https://playback.example',
      expires_at: PLAYBACK_EXPIRES_AT,
      ttl_seconds: 3600,
      download_allowed: false,
    });
  });

  it('emits deletion request events without recording content', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      uploadStatus: RecordingUploadStatus.UPLOADED,
      archiveStatus: 'archived',
      relatedQuestionText: '어릴 때 가장 좋아한 음식은?',
    });

    await expect(
      service.requestDeletion('recording-id', 'user-id'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'recording-id',
        archive_status: 'deletion_requested',
      }),
    );

    expect(appEventsService.emit).toHaveBeenCalledWith({
      userId: 'user-id',
      name: 'recording.deletion_requested',
      subjectId: 'subject-id',
      recordingId: 'recording-id',
      payload: {
        archiveStatus: 'deletion_requested',
      },
    });
    expect(JSON.stringify(appEventsService.emit.mock.calls[0][0])).not.toContain(
      '좋아한 음식',
    );
  });

  it('rejects Preview analysis after emitting deferred placeholder event', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
    });

    await expect(
      service.requestPreviewAnalysis('recording-id', 'user-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(recordingsRepository.save).not.toHaveBeenCalled();
    expect(audioStorageService.createUploadIntent).not.toHaveBeenCalled();
    expect(audioStorageService.createPlaybackUrl).not.toHaveBeenCalled();
    expect(appEventsService.emit).toHaveBeenCalledWith({
      userId: 'user-id',
      name: 'recording.preview_analysis_deferred',
      subjectId: 'subject-id',
      recordingId: 'recording-id',
      payload: {
        feature: 'preview_analysis',
        retryable: false,
      },
    });
  });
});
