import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisJob } from '../analysis/analysis-job.entity';
import { Recording } from '../recordings/recording.entity';
import { Subject } from '../subjects/subject.entity';
import { DeterministicRedactor } from './deterministic-redactor';
import { MaskingSpan } from './masking-span.entity';
import { MaskingService } from './masking.service';
import { TranscriptRedaction } from './transcript-redaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TranscriptRedaction,
      MaskingSpan,
      Subject,
      Recording,
      AnalysisJob,
    ]),
  ],
  providers: [DeterministicRedactor, MaskingService],
  exports: [DeterministicRedactor, MaskingService],
})
export class MaskingModule {}
