import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class MemoryDto {
  @ApiProperty({ example: 'mem-001' })
  id: string;

  @ApiProperty({ example: '봄 소풍' })
  title: string;

  @ApiProperty({ example: 'EPISODE' })
  memoryType: string;

  @ApiProperty({ type: [String], example: ['손자', '할머니'] })
  relatedPeople: string[];

  @ApiProperty({ example: '1998-04', nullable: true })
  relatedPeriod: string | null;

  @ApiProperty({ example: '그날 같이 김밥을 먹었지.' })
  bodyMarkdown: string;

  @ApiProperty({ type: [String], example: ['봄', '소풍'] })
  tags: string[];

  @ApiProperty({ example: 0.92 })
  confidenceScore: number;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;
}

export class MemoryListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [MemoryDto] })
  data: MemoryDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class MemoryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MemoryDto })
  data: MemoryDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
