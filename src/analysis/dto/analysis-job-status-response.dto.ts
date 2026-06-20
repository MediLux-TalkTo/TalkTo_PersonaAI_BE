import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';
import {
  AnalysisJobStatus,
  analysisJobStatusValues,
} from '../analysis-job.constants';

export class AnalysisJobProgressDto {
  @ApiProperty({ enum: analysisJobStatusValues, example: AnalysisJobStatus.EMBEDDING })
  stage: AnalysisJobStatus;

  @ApiProperty({ example: 85, minimum: 0, maximum: 100 })
  percent: number;

  @ApiProperty({ example: false })
  terminal: boolean;
}

export class AnalysisJobStatusDto {
  @ApiProperty({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066010001' })
  id: string;

  @ApiProperty({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066010002' })
  ownerUserId: string;

  @ApiProperty({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066010003' })
  recordingId: string;

  @ApiProperty({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066010004' })
  subjectId: string;

  @ApiProperty({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066010005' })
  orderId: string;

  @ApiProperty({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066010006' })
  entitlementId: string;

  @ApiProperty({ enum: analysisJobStatusValues, example: AnalysisJobStatus.QUEUED })
  status: AnalysisJobStatus;

  @ApiProperty({ type: AnalysisJobProgressDto })
  progress: AnalysisJobProgressDto;

  @ApiProperty({ example: 1 })
  retryCount: number;

  @ApiProperty({ example: 3 })
  maxRetries: number;

  @ApiProperty({ example: 'worker_timeout', nullable: true })
  failureCode: string | null;

  @ApiProperty({ example: 'Worker timed out.', nullable: true })
  failureMessage: string | null;

  @ApiProperty({ example: '2026-06-18T00:00:00.000Z' })
  statusChangedAt: string;

  @ApiProperty({ example: null, nullable: true })
  completedAt: string | null;

  @ApiProperty({ example: '2026-06-18T00:01:00.000Z', nullable: true })
  failedAt: string | null;

  @ApiProperty({ example: null, nullable: true })
  cancelledAt: string | null;

  @ApiProperty({ example: '2026-06-18T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-06-18T00:01:00.000Z' })
  updatedAt: string;
}

export class AnalysisJobStatusListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [AnalysisJobStatusDto] })
  data: AnalysisJobStatusDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class AnalysisJobStatusResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: AnalysisJobStatusDto })
  data: AnalysisJobStatusDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
