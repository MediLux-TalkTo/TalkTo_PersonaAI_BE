import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateMemoryDto {
  @ApiProperty({ example: '봄 소풍', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'EPISODE' })
  @IsString()
  memoryType: string;

  @ApiPropertyOptional({ type: [String], example: ['손자', '할머니'] })
  @IsOptional()
  @IsArray()
  relatedPeople?: string[];

  @ApiPropertyOptional({ example: '1998-04' })
  @IsOptional()
  @IsString()
  relatedPeriod?: string;

  @ApiProperty({ example: '그날 같이 김밥을 먹었지.' })
  @IsString()
  bodyMarkdown: string;

  @ApiPropertyOptional({ type: [String], example: ['봄', '소풍'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({ example: 0.92, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;
}
