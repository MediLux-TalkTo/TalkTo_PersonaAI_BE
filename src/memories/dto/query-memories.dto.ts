import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MemoryStatus } from '../../common/enums/memory.enums';

export class QueryMemoriesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  person?: string;

  @IsOptional()
  @IsEnum(MemoryStatus)
  status?: MemoryStatus;
}
