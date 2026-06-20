import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { EventsModule } from '../events/events.module';
import { Recording } from '../recordings/recording.entity';
import { StorageModule } from '../storage/storage.module';
import { MemorySegmentFeedback } from './memory-segment-feedback.entity';
import { MemorySegmentsController } from './memory-segments.controller';
import { MemorySegmentsService } from './memory-segments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MemorySegment, Recording, MemorySegmentFeedback]),
    AuditModule,
    EventsModule,
    StorageModule,
  ],
  controllers: [MemorySegmentsController],
  providers: [MemorySegmentsService],
})
export class MemorySegmentsModule {}
