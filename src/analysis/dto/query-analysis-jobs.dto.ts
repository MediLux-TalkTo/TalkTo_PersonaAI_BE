import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  AnalysisJobStatus,
  analysisJobStatusValues,
} from '../analysis-job.constants';

export class QueryAnalysisJobsDto {
  @ApiPropertyOptional({
    enum: analysisJobStatusValues,
    example: AnalysisJobStatus.FAILED_RETRYABLE,
  })
  @IsOptional()
  @IsEnum(AnalysisJobStatus)
  status?: AnalysisJobStatus;

  @ApiPropertyOptional({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066010010' })
  @IsOptional()
  @IsUUID()
  recordingId?: string;

  @ApiPropertyOptional({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066010011' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
