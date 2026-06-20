import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ConsentsModule } from '../consents/consents.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Order } from '../orders/order.entity';
import { Entitlement } from '../payments/entitlement.entity';
import { Recording } from '../recordings/recording.entity';
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
    ]),
    AuditModule,
    ConsentsModule,
    EventsModule,
    NotificationsModule,
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
  ],
  exports: [
    AnalysisJobsService,
    AnalysisJobStatusService,
    AnalysisWorkerTransitionsService,
  ],
})
export class AnalysisModule {}
