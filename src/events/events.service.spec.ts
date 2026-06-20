import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AppEvent } from './app-event.entity';
import { AppEventsService } from './events.service';

describe('AppEventsService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ ...value, id: 'app-event-id' })),
  });

  let service: AppEventsService;
  let eventsRepository: ReturnType<typeof repository>;

  beforeEach(async () => {
    eventsRepository = repository();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AppEventsService,
        { provide: getRepositoryToken(AppEvent), useValue: eventsRepository },
      ],
    }).compile();

    service = moduleRef.get(AppEventsService);
  });

  it('stores sanitized non-sensitive event payloads', async () => {
    await service.emit({
      userId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb',
      name: 'recording.upload_intent_created',
      subjectId: '23bb1733-96e4-4b5f-aee9-7adc7008bc08',
      recordingId: 'b1b70a9a-176c-4e74-a38a-3a758e591fe1',
      payload: {
        mimeType: 'audio/mp4',
        uploadUrl: 'https://r2.example.com/audio.m4a?X-Amz-Signature=secret',
        rawTranscript: '원문 녹취',
        questionText: '어릴 때 가장 좋아한 음식은?',
        nested: {
          providerSecret: 'sk-secret',
          allowedState: 'uploading',
        },
      },
    });

    expect(eventsRepository.create).toHaveBeenCalledWith({
      userId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb',
      name: 'recording.upload_intent_created',
      subjectId: '23bb1733-96e4-4b5f-aee9-7adc7008bc08',
      recordingId: 'b1b70a9a-176c-4e74-a38a-3a758e591fe1',
      orderId: null,
      payload: {
        mimeType: 'audio/mp4',
        nested: {
          allowedState: 'uploading',
        },
      },
    });
    expect(JSON.stringify(eventsRepository.create.mock.calls[0][0])).not.toContain(
      'X-Amz-Signature',
    );
    expect(JSON.stringify(eventsRepository.create.mock.calls[0][0])).not.toContain(
      '원문 녹취',
    );
    expect(JSON.stringify(eventsRepository.create.mock.calls[0][0])).not.toContain(
      '좋아한 음식',
    );
    expect(JSON.stringify(eventsRepository.create.mock.calls[0][0])).not.toContain(
      'sk-secret',
    );
  });

  it('drops oversized payload fields before storage', async () => {
    await service.emit({
      userId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb',
      name: 'subject.updated',
      payload: {
        allowedState: 'ready',
        nested: {
          oversized: 'x'.repeat(4097),
        },
      },
    });

    expect(eventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          allowedState: 'ready',
        },
      }),
    );
  });

  it('does not fail callers when event storage is unavailable', async () => {
    eventsRepository.save.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.emit({
        userId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb',
        name: 'subject.created',
      }),
    ).resolves.toBeNull();
  });
});
