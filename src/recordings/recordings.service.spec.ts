import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../common/enums/archive.enums';
import { AudioStorageService } from '../storage/audio-storage.service';
import { SubjectsService } from '../subjects/subjects.service';
import { Recording } from './recording.entity';
import { RecordingsService } from './recordings.service';

describe('RecordingsService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ ...value, id: value.id ?? 'recording-id' })),
  });

  let service: RecordingsService;
  let recordingsRepository: ReturnType<typeof repository>;
  let subjectsService: { getOwned: jest.Mock };
  let audioStorageService: {
    createUploadIntent: jest.Mock;
    createPlaybackUrl: jest.Mock;
  };

  beforeEach(async () => {
    recordingsRepository = repository();
    subjectsService = {
      getOwned: jest.fn().mockResolvedValue({ id: 'subject-id' }),
    };
    audioStorageService = {
      createUploadIntent: jest.fn().mockResolvedValue({
        storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
        uploadUrl: 'https://upload.example',
        expiresAt: new Date('2026-06-05T00:00:00.000Z'),
        method: 'PUT',
      }),
      createPlaybackUrl: jest.fn().mockResolvedValue({
        playbackUrl: 'https://playback.example',
        expiresAt: new Date('2026-06-05T01:00:00.000Z'),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RecordingsService,
        { provide: getRepositoryToken(Recording), useValue: recordingsRepository },
        { provide: SubjectsService, useValue: subjectsService },
        { provide: AudioStorageService, useValue: audioStorageService },
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

  it('marks upload as completed and can issue playback URL', async () => {
    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      uploadStatus: RecordingUploadStatus.UPLOADING,
    });

    await expect(
      service.completeUpload('recording-id', 'user-id', {}),
    ).resolves.toEqual(
      expect.objectContaining({
        uploadStatus: RecordingUploadStatus.UPLOADED,
      }),
    );

    recordingsRepository.findOne.mockResolvedValue({
      id: 'recording-id',
      ownerUserId: 'user-id',
      storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
      uploadStatus: RecordingUploadStatus.UPLOADED,
    });

    await expect(service.createPlaybackUrl('recording-id', 'user-id')).resolves.toEqual({
      playbackUrl: 'https://playback.example',
      expiresAt: new Date('2026-06-05T01:00:00.000Z'),
    });
  });
});
