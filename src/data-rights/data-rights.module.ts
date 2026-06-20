import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { EventsModule } from '../events/events.module';
import { TranscriptRedaction } from '../masking/transcript-redaction.entity';
import { VoiceProviderAsset } from '../voice-persona/voice-provider-asset.entity';
import { DataRightsController } from './data-rights.controller';
import { DataRightsService } from './data-rights.service';
import { DataDeletionRequest } from './data-deletion-request.entity';
import { ProviderDeletionRecord } from './provider-deletion-record.entity';
import { ResearchExportPreference } from './research-export-preference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResearchExportPreference,
      MemorySegment,
      TranscriptRedaction,
      DataDeletionRequest,
      ProviderDeletionRecord,
      VoiceProviderAsset,
    ]),
    AuditModule,
    EventsModule,
  ],
  controllers: [DataRightsController],
  providers: [DataRightsService],
  exports: [DataRightsService],
})
export class DataRightsModule {}
