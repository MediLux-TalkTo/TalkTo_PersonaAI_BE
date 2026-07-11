import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { ConsentsModule } from '../consents/consents.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Order } from '../orders/order.entity';
import { Entitlement } from '../payments/entitlement.entity';
import { Recording } from '../recordings/recording.entity';
import { StorageModule } from '../storage/storage.module';
import { FamilyGlossaryTerm } from '../subjects/family-glossary-term.entity';
import { Subject } from '../subjects/subject.entity';
import { PersonaIntake } from '../voice-persona/persona-intake.entity';
import { PersonaBible } from '../voice-persona/persona-bible.entity';
import { PersonaReflection } from '../voice-persona/persona-reflection.entity';
import { TargetVoiceSample } from '../voice-persona/target-voice-sample.entity';
import { VoicePersonaApplication } from '../voice-persona/voice-persona-application.entity';
import { AnalysisAiTranscriptionService } from './analysis-ai-transcription.service';
import { AdminAnalysisJobsController } from './admin-analysis-jobs.controller';
import { AnalysisEmbedding } from './analysis-embedding.entity';
import { AnalysisJob } from './analysis-job.entity';
import { AnalysisJobStatusService } from './analysis-job-status.service';
import { AnalysisWorkerTransitionsController } from './analysis-worker-transitions.controller';
import { AnalysisWorkerTransitionsService } from './analysis-worker-transitions.service';
import { AnalysisJobsController } from './analysis-jobs.controller';
import { AnalysisJobsService } from './analysis-jobs.service';
import { MemorySegment } from './memory-segment.entity';
import { MemoriesAnalysisJobsController } from './memories-analysis-jobs.controller';
import { TranscriptSegment } from './transcript-segment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalysisJob,
      Recording,
      Entitlement,
      Order,
      TranscriptSegment,
      MemorySegment,
      AnalysisEmbedding,
      Subject,
      FamilyGlossaryTerm,
      VoicePersonaApplication,
      PersonaIntake,
      PersonaBible,
      PersonaReflection,
      TargetVoiceSample,
    ]),
    AiModule,
    AuditModule,
    ConsentsModule,
    EventsModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [
    AnalysisJobsController,
    MemoriesAnalysisJobsController,
    AdminAnalysisJobsController,
    AnalysisWorkerTransitionsController,
  ],
  providers: [
    AnalysisJobsService,
    AnalysisJobStatusService,
    AnalysisWorkerTransitionsService,
    AnalysisAiTranscriptionService,
  ],
  exports: [
    AnalysisJobsService,
    AnalysisJobStatusService,
    AnalysisWorkerTransitionsService,
    AnalysisAiTranscriptionService,
  ],
})
export class AnalysisModule {}
