import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class MemoriesStatusDto {
  @ApiProperty({ example: true })
  entitled: boolean;

  @ApiProperty({ example: true })
  searchable: boolean;

  @ApiProperty({ example: 12 })
  indexedSegmentCount: number;

  @ApiProperty({ example: 2 })
  completedJobCount: number;

  @ApiProperty({ example: '2026-06-18T00:00:00.000Z', nullable: true })
  latestCompletedAt: string | null;
}

export class MemoriesStatusResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MemoriesStatusDto })
  data: MemoriesStatusDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class MemorySearchSegmentDto {
  @ApiProperty({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066020001' })
  id: string;

  @ApiProperty({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066020002' })
  recordingId: string;

  @ApiProperty({ example: '8a1c6f1d-0e23-4db9-aabc-c0d066020003' })
  subjectId: string;

  @ApiProperty({ example: 12000 })
  startMs: number;

  @ApiProperty({ example: 22000 })
  endMs: number;

  @ApiProperty({ example: 'unknown' })
  speakerLabel: string;

  @ApiProperty({ example: '할머니는 매년 봄마다 진달래를 보러 갔다.' })
  text: string;

  @ApiProperty({ example: 0.87 })
  score: number;

  @ApiProperty({ example: false })
  lowConfidence: boolean;
}

export class MemoriesSearchResultDto {
  @ApiProperty({ example: 'answered' })
  status: 'answered' | 'no_results';

  @ApiProperty({
    example: '관련 기억 2개를 찾았습니다. 가장 관련 있는 기록은 ...',
  })
  answer: string;

  @ApiProperty({ example: 2 })
  resultCount: number;

  @ApiProperty({ type: [MemorySearchSegmentDto] })
  segments: MemorySearchSegmentDto[];

  @ApiProperty({ example: false })
  lowConfidence: boolean;
}

export class MemoriesSearchResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MemoriesSearchResultDto })
  data: MemoriesSearchResultDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
