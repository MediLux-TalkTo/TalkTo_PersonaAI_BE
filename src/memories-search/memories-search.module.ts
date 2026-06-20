import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AnalysisEmbedding } from '../analysis/analysis-embedding.entity';
import { AnalysisJob } from '../analysis/analysis-job.entity';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { ConsentsModule } from '../consents/consents.module';
import { Entitlement } from '../payments/entitlement.entity';
import { MemoriesSearchService } from './memories-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MemorySegment,
      AnalysisEmbedding,
      AnalysisJob,
      Entitlement,
    ]),
    AiModule,
    ConsentsModule,
  ],
  providers: [MemoriesSearchService],
  exports: [MemoriesSearchService],
})
export class MemoriesSearchModule {}
