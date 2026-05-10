import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiMetaDto {
  @ApiProperty({
    description: '응답 생성 시각',
    example: '2026-05-10T07:15:00.000Z',
  })
  timestamp: string;

  @ApiPropertyOptional({
    description: '추가 메타데이터',
    example: {},
  })
  extra?: Record<string, unknown>;
}
