import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateMemorySegmentPlaybackDto {
  @ApiPropertyOptional({
    description: 'Milliseconds of context to include before and after the segment.',
    default: 3000,
    minimum: 0,
    maximum: 30000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30000)
  bufferMs?: number;
}
