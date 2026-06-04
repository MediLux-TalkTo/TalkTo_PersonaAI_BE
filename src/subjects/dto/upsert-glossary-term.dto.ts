import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { GlossaryTermType } from '../../common/enums/archive.enums';

export class UpsertGlossaryTermDto {
  @ApiProperty({ enum: GlossaryTermType, example: GlossaryTermType.PERSON })
  @IsEnum(GlossaryTermType)
  termType: GlossaryTermType;

  @ApiProperty({ example: '찬민', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  term: string;

  @ApiPropertyOptional({ example: '찬미니', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pronunciationHint?: string;

  @ApiPropertyOptional({ example: '손자 이름', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  meaning?: string;
}
