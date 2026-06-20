import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingSituationEvent } from './onboarding-situation-event.entity';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [TypeOrmModule.forFeature([OnboardingSituationEvent]), EventsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
