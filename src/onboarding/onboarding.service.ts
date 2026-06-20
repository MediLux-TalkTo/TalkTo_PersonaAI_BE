import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OnboardingSituation,
  type OnboardingSituationValue,
} from '../common/enums/archive.enums';
import { AppEventsService } from '../events/events.service';
import { RecordSituationDto } from './dto/record-situation.dto';
import { OnboardingSituationEvent } from './onboarding-situation-event.entity';

type OnboardingSituationResponse = {
  readonly id: string;
  readonly situation: OnboardingSituationValue;
  readonly nextRoute: string;
  readonly createdAt: Date;
};

const NEXT_ROUTES: Record<OnboardingSituationValue, string> = {
  [OnboardingSituation.LIVING]: '/subjects/new?lifeStatus=LIVING',
  [OnboardingSituation.DECEASED]: '/subjects/new?lifeStatus=DECEASED',
  [OnboardingSituation.VOICE_PERSONA_INTEREST]:
    '/subjects/new?intent=voice-persona',
};

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(OnboardingSituationEvent)
    private readonly eventsRepository: Repository<OnboardingSituationEvent>,
    private readonly appEventsService: AppEventsService,
  ) {}

  async recordSituation(
    userId: string,
    dto: RecordSituationDto,
  ): Promise<OnboardingSituationResponse> {
    const nextRoute = NEXT_ROUTES[dto.situation];
    const event = this.eventsRepository.create({
      userId,
      situation: dto.situation,
      nextRoute,
    });
    const savedEvent = await this.eventsRepository.save(event);
    await this.appEventsService.emit({
      userId,
      name: 'onboarding.situation_recorded',
      payload: {
        situation: savedEvent.situation,
        nextRoute: savedEvent.nextRoute,
      },
    });

    return {
      id: savedEvent.id,
      situation: savedEvent.situation,
      nextRoute: savedEvent.nextRoute,
      createdAt: savedEvent.createdAt,
    };
  }
}
