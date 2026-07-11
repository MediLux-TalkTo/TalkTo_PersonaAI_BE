import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { TranscriptSegment } from '../analysis/transcript-segment.entity';
import { AnalysisJob } from '../analysis/analysis-job.entity';
import { ConsentsModule } from '../consents/consents.module';
import { EventsModule } from '../events/events.module';
import { Entitlement } from '../payments/entitlement.entity';
import { Recording } from '../recordings/recording.entity';
import { StorageModule } from '../storage/storage.module';
import { Subject } from '../subjects/subject.entity';
import { SubjectsModule } from '../subjects/subjects.module';
import { AuditModule } from '../audit/audit.module';
import { AdminVoicePersonaController } from './admin-voice-persona.controller';
import { PersonaBuildJob } from './persona-build-job.entity';
import { PersonaBible } from './persona-bible.entity';
import { PersonaFamilyReview } from './persona-family-review.entity';
import { PersonaIntake } from './persona-intake.entity';
import { PersonaReflection } from './persona-reflection.entity';
import { PersonaRuntimeConfig } from './persona-runtime-config.entity';
import { TargetVoiceSample } from './target-voice-sample.entity';
import { VoiceProviderAsset } from './voice-provider-asset.entity';
import { VoicePersonaApplication } from './voice-persona-application.entity';
import { VoicePersonaController } from './voice-persona.controller';
import { VoicePersonaDocument } from './voice-persona-document.entity';
import { VoicePersonaService } from './voice-persona.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoicePersonaApplication,
      VoicePersonaDocument,
      PersonaIntake,
      PersonaReflection,
      TargetVoiceSample,
      PersonaBuildJob,
      PersonaBible,
      VoiceProviderAsset,
      PersonaFamilyReview,
      PersonaRuntimeConfig,
      Entitlement,
      Subject,
      AnalysisJob,
      TranscriptSegment,
      Recording,
    ]),
    AiModule,
    AuditModule,
    ConsentsModule,
    EventsModule,
    SubjectsModule,
    StorageModule,
  ],
  controllers: [VoicePersonaController, AdminVoicePersonaController],
  providers: [VoicePersonaService],
  exports: [VoicePersonaService],
})
export class VoicePersonaModule {}
