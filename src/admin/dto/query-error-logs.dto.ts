import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SystemLogCategory, SystemLogSeverity } from '../../common/enums/log.enum';

export class QueryErrorLogsDto {
  @ApiPropertyOptional({ enum: SystemLogCategory, example: SystemLogCategory.STT })
  @IsOptional()
  @IsEnum(SystemLogCategory)
  category?: SystemLogCategory;

  @ApiPropertyOptional({ enum: SystemLogSeverity, example: SystemLogSeverity.ERROR })
  @IsOptional()
  @IsEnum(SystemLogSeverity)
  severity?: SystemLogSeverity;

  @ApiPropertyOptional({ example: '2026-05-10T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-10T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  to?: string;
}
