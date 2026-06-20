import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AppEventsService } from '../events/events.service';
import { OnboardingSituationEvent } from './onboarding-situation-event.entity';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: 'event-id',
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
      ...value,
    })),
  });

  let service: OnboardingService;
  let eventsRepository: ReturnType<typeof repository>;
  let appEventsService: { emit: jest.Mock };

  beforeEach(async () => {
    eventsRepository = repository();
    appEventsService = { emit: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getRepositoryToken(OnboardingSituationEvent),
          useValue: eventsRepository,
        },
        { provide: AppEventsService, useValue: appEventsService },
      ],
    }).compile();

    service = moduleRef.get(OnboardingService);
  });

  it.each([
    ['living', '/subjects/new?lifeStatus=LIVING'],
    ['deceased', '/subjects/new?lifeStatus=DECEASED'],
    ['voice_persona_interest', '/subjects/new?intent=voice-persona'],
  ] as const)(
    'stores a %s situation event and returns the next route',
    async (situation, nextRoute) => {
      const response = await service.recordSituation('user-id', {
        situation,
      });

      expect(eventsRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        situation,
        nextRoute,
      });
      expect(response).toEqual({
        id: 'event-id',
        situation,
        nextRoute,
        createdAt: new Date('2026-06-17T00:00:00.000Z'),
      });
      expect(appEventsService.emit).toHaveBeenCalledWith({
        userId: 'user-id',
        name: 'onboarding.situation_recorded',
        payload: {
          situation,
          nextRoute,
        },
      });
    },
  );
});
