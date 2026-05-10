import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateMemoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  memoryType?: string;

  @IsOptional()
  @IsArray()
  relatedPeople?: string[];

  @IsOptional()
  @IsString()
  relatedPeriod?: string;

  @IsOptional()
  @IsString()
  bodyMarkdown?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;
}
