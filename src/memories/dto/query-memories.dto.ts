import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MemoryStatus } from '../../common/enums/memory.enums';

export class QueryMemoriesDto {
  @ApiPropertyOptional({ example: '소풍' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'EPISODE' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '손자' })
  @IsOptional()
  @IsString()
  person?: string;

  @ApiPropertyOptional({ enum: MemoryStatus, example: MemoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MemoryStatus)
  status?: MemoryStatus;
}
