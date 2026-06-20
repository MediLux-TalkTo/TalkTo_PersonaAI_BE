import { ApiProperty } from '@nestjs/swagger';
import { AnalysisJobStatus, analysisJobStatusValues } from '../analysis-job.constants';

export class AnalysisJobDto {
  @ApiProperty({ example: 'analysis-job-id' })
  id: string;

  @ApiProperty({ example: 'recording-id' })
  recordingId: string;

  @ApiProperty({ example: 'subject-id' })
  subjectId: string;

  @ApiProperty({ example: 'order-id' })
  orderId: string;

  @ApiProperty({ example: 'entitlement-id' })
  entitlementId: string;

  @ApiProperty({ enum: analysisJobStatusValues, example: AnalysisJobStatus.QUEUED })
  status: AnalysisJobStatus;

  @ApiProperty({ example: 0 })
  retryCount: number;

  @ApiProperty({ example: 3 })
  maxRetries: number;

  @ApiProperty({ example: null, nullable: true })
  failureCode: string | null;

  @ApiProperty({ example: null, nullable: true })
  failureMessage: string | null;
}

export class AnalysisJobResponseDto {
  @ApiProperty({ type: AnalysisJobDto })
  data: AnalysisJobDto;
}
