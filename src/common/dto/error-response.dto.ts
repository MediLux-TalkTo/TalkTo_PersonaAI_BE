import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiMetaDto } from '../swagger/api-meta.dto';

export class ErrorDetailDto {
  @ApiProperty({ example: 'Unauthorized' })
  message: string | string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  details?: Record<string, unknown>;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      code: { type: 'string', example: 'UNAUTHORIZED' },
      message: { type: 'string', example: 'Authentication is required.' },
      details: {
        type: 'object',
        additionalProperties: true,
        example: {},
      },
    },
  })
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
