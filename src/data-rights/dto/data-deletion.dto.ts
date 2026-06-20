import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  DATA_DELETION_CONFIRMATION,
  DataDeletionRequestStatus,
  DataDeletionScope,
  ProviderDeletionStatus,
} from '../data-deletion.constants';

export class CreateDataDeletionRequestDto {
  @ApiProperty({ enum: Object.values(DataDeletionScope) })
  @IsEnum(DataDeletionScope)
  scope: DataDeletionScope;

  @ApiProperty({ example: DATA_DELETION_CONFIRMATION })
  @IsString()
  confirmation: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recordingId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateDataDeletionRequestDto {
  @ApiProperty({ enum: Object.values(DataDeletionRequestStatus) })
  @IsEnum(DataDeletionRequestStatus)
  status: DataDeletionRequestStatus;
}

export class UpdateProviderDeletionRecordDto {
  @ApiProperty({ enum: Object.values(ProviderDeletionStatus) })
  @IsEnum(ProviderDeletionStatus)
  status: ProviderDeletionStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
