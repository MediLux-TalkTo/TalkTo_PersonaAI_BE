import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ConsentsModule } from '../consents/consents.module';
import { EventsModule } from '../events/events.module';
import { StorageModule } from '../storage/storage.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { RecordingUploadIntent } from './recording-upload-intent.entity';
import { Recording } from './recording.entity';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recording, RecordingUploadIntent]),
    SubjectsModule,
    StorageModule,
    ConsentsModule,
    AuditModule,
    EventsModule,
  ],
  controllers: [RecordingsController],
  providers: [RecordingsService],
})
export class RecordingsModule {}
