import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AnalysisEmbedding } from '../analysis/analysis-embedding.entity';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { ConsentsModule } from '../consents/consents.module';
import { EventsModule } from '../events/events.module';
import { StorageModule } from '../storage/storage.module';
import { Subject } from '../subjects/subject.entity';
import { PersonaRuntimeConfig } from '../voice-persona/persona-runtime-config.entity';
import { PersonaRuntimeController } from './persona-runtime.controller';
import { PersonaRuntimeMessage } from './persona-runtime-message.entity';
import { PersonaRuntimeService } from './persona-runtime.service';
import { PersonaRuntimeSession } from './persona-runtime-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PersonaRuntimeSession,
      PersonaRuntimeMessage,
      PersonaRuntimeConfig,
      MemorySegment,
      AnalysisEmbedding,
      Subject,
    ]),
    AiModule,
    ConsentsModule,
    EventsModule,
    StorageModule,
  ],
  controllers: [PersonaRuntimeController],
  providers: [PersonaRuntimeService],
})
export class PersonaRuntimeModule {}
