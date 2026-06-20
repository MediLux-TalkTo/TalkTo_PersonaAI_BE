import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { RecordingUploadStatus } from '../common/enums/archive.enums';
import { ConsentFeature, ConsentType } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { AudioStorageService } from '../storage/audio-storage.service';
import { SubjectsService } from '../subjects/subjects.service';
import { RecordingUploadIntent } from './recording-upload-intent.entity';
import { Recording, RecordingArchiveStatus } from './recording.entity';
import { RecordingsService } from './recordings.service';
import { RecordingUploadIntentStatus } from './upload-intent.constants';

describe('RecordingsService consent gates', () => {
  const recordingsRepository = {
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ ...value, id: value.id ?? 'recording-id' })),
  };
  const uploadIntentsRepository = {
    create: jest.fn((value) => value),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ ...value, id: value.id ?? 'intent-id' })),
  };
  const subjectsService = {
    getOwned: jest.fn().mockResolvedValue({ id: 'subject-id' }),
  };
  const audioStorageService = {
    createUploadIntent: jest.fn().mockResolvedValue({
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      uploadUrl: 'https://upload.example',
      expiresAt: new Date('2026-06-05T00:00:00.000Z'),
      method: 'PUT',
    }),
    createPlaybackUrl: jest.fn(),
    verifyUploadObject: jest.fn(),
  };
  const consentsService = {
    assertRequiredConsents: jest.fn().mockResolvedValue(undefined),
  };
  const appEventsService = {
    emit: jest.fn().mockResolvedValue(undefined),
  };

  let service: RecordingsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    appEventsService.emit.mockResolvedValue(undefined);

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

  it('requires only Archive storage and privacy consents for free upload', async () => {
    consentsService.assertRequiredConsents.mockRejectedValueOnce(
      new ForbiddenException({
        code: 'requires_consent',
        message: 'Archive upload requires consent.',
        missing_consent_types: [
          ConsentType.PRIVACY_COLLECTION,
          ConsentType.AUDIO_STORAGE_SERVICE,
        ],
      }),
    );

    await expect(
      service.createUploadIntent('user-id', {
        subjectId: 'subject-id',
        originalFilename: 'call.m4a',
        mimeType: 'audio/mp4',
        fileSizeBytes: 1024,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'requires_consent',
        missing_consent_types: expect.arrayContaining([
          ConsentType.PRIVACY_COLLECTION,
          ConsentType.AUDIO_STORAGE_SERVICE,
        ]),
      }),
    });

    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.ARCHIVE,
      'subject-id',
    );
    expect(recordingsRepository.create).not.toHaveBeenCalled();
    expect(audioStorageService.createUploadIntent).not.toHaveBeenCalled();
  });

  it('requires Archive consent before retry issues a new storage upload URL', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
      originalFilename: 'call.m4a',
      mimeType: 'audio/mp4',
      fileSizeBytes: '1024',
      uploadStatus: RecordingUploadStatus.UPLOAD_FAILED,
      archiveStatus: RecordingArchiveStatus.PENDING_UPLOAD,
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
    consentsService.assertRequiredConsents.mockRejectedValueOnce(
      new ForbiddenException({
        code: 'requires_consent',
        message: 'Archive retry requires consent.',
        missing_consent_types: [
          ConsentType.PRIVACY_COLLECTION,
          ConsentType.AUDIO_STORAGE_SERVICE,
        ],
      }),
    );

    await expect(
      service.retryUploadIntent('recording-id', 'user-id', 'intent-id'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'requires_consent',
        missing_consent_types: expect.arrayContaining([
          ConsentType.PRIVACY_COLLECTION,
          ConsentType.AUDIO_STORAGE_SERVICE,
        ]),
      }),
    });

    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.ARCHIVE,
      'subject-id',
    );
    expect(audioStorageService.createUploadIntent).not.toHaveBeenCalled();
    expect(recordingsRepository.save).not.toHaveBeenCalled();
    expect(uploadIntentsRepository.create).not.toHaveBeenCalled();
  });

  it('keeps playback owner-viewable after consent withdrawal', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      uploadStatus: RecordingUploadStatus.UPLOADED,
      archiveStatus: RecordingArchiveStatus.ARCHIVED,
    });
    audioStorageService.createPlaybackUrl.mockResolvedValue({
      playbackUrl: 'https://playback.example',
      expiresAt: new Date('2026-06-05T01:00:00.000Z'),
    });

    await expect(service.createPlaybackUrl('recording-id', 'user-id')).resolves.toEqual(
      expect.objectContaining({
        playback_url: 'https://playback.example',
        expires_at: new Date('2026-06-05T01:00:00.000Z'),
        download_allowed: false,
      }),
    );

    expect(consentsService.assertRequiredConsents).not.toHaveBeenCalled();
  });

  it('requires Memories consent before preview analysis placeholder runs', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
    });
    consentsService.assertRequiredConsents.mockRejectedValueOnce(
      new ForbiddenException({
        code: 'requires_consent',
        message: 'Memories analysis requires consent.',
        missing_consent_types: [
          ConsentType.AI_ANALYSIS_SERVICE,
          ConsentType.OVERSEAS_TRANSFER_LLM_PROVIDER,
        ],
      }),
    );

    await expect(
      service.requestPreviewAnalysis('recording-id', 'user-id'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'requires_consent',
        missing_consent_types: expect.arrayContaining([
          ConsentType.AI_ANALYSIS_SERVICE,
          ConsentType.OVERSEAS_TRANSFER_LLM_PROVIDER,
        ]),
      }),
    });

    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.MEMORIES,
      'subject-id',
    );
  });
});
