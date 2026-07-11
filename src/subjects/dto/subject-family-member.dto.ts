import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SubjectFamilyMemberDto {
  @ApiProperty({ example: '종서', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '막내아들', nullable: true, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationToSubject?: string | null;

  @ApiPropertyOptional({ example: ['종서야'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  addressTerms?: string[];
}
