import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SystemLogCategory, SystemLogSeverity } from '../../common/enums/log.enum';

export class QueryErrorLogsDto {
  @IsOptional()
  @IsEnum(SystemLogCategory)
  category?: SystemLogCategory;

  @IsOptional()
  @IsEnum(SystemLogSeverity)
  severity?: SystemLogSeverity;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
