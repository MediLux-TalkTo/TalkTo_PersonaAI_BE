import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class WorkerTransitionDto {
  @ApiPropertyOptional({ example: 'worker-1', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  workerId?: string;
}

export class TranscriptSegmentInputDto {
  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  segmentIndex: number;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  startMs: number;

  @ApiProperty({ example: 2500, minimum: 0 })
  @IsInt()
  @Min(0)
  endMs: number;

  @ApiPropertyOptional({ example: 'speaker_1', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  speakerLabel?: string;

  @ApiProperty({ example: 'Synthetic redacted transcript.' })
  @IsString()
  @MaxLength(20000)
  transcriptText: string;
}

export class MarkSttDto {
  @ApiProperty({ type: [TranscriptSegmentInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TranscriptSegmentInputDto)
  segments: TranscriptSegmentInputDto[];
}

export class MemorySegmentInputDto {
  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  segmentIndex: number;

  @ApiProperty({ example: ['transcript-segment-id'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  sourceTranscriptSegmentIds: string[];

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  startMs: number;

  @ApiProperty({ example: 2500, minimum: 0 })
  @IsInt()
  @Min(0)
  endMs: number;

  @ApiPropertyOptional({ example: 'unknown', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  speakerLabel?: string;

  @ApiProperty({ example: 'Synthetic memory segment.' })
  @IsString()
  @MaxLength(20000)
  memoryText: string;
}

export class MarkSegmentingDto {
  @ApiProperty({ type: [MemorySegmentInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MemorySegmentInputDto)
  segments: MemorySegmentInputDto[];
}

export class EmbeddingInputDto {
  @ApiProperty({ example: 'memory-segment-id' })
  @IsUUID()
  memorySegmentId: string;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  embeddingIndex: number;

  @ApiProperty({ example: 'synthetic', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  provider: string;

  @ApiProperty({ example: 'unit-test', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  model: string;

  @ApiProperty({ example: 1536, minimum: 1 })
  @IsInt()
  @Min(1)
  dimensions: number;

  @ApiProperty({ example: [0.1, 0.2, 0.3] })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  embedding: number[];
}

export class MarkIndexingDto {
  @ApiProperty({ type: [EmbeddingInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmbeddingInputDto)
  embeddings: EmbeddingInputDto[];
}

export class MarkFailedDto {
  @ApiProperty({ example: 'worker_timeout', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  failureCode: string;

  @ApiPropertyOptional({ example: 'Synthetic worker failure.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  failureMessage?: string;
}
