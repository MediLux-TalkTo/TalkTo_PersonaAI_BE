import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SearchMemoriesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  q: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  recordingId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class MemoriesStatusQueryDto {
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}
