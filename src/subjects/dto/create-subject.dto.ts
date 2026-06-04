import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SubjectLifeStatus } from '../../common/enums/archive.enums';

export class CreateSubjectDto {
  @ApiProperty({ example: '할머니', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ example: 'grandmother', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  relationship: string;

  @ApiPropertyOptional({
    enum: SubjectLifeStatus,
    example: SubjectLifeStatus.LIVING,
  })
  @IsOptional()
  @IsEnum(SubjectLifeStatus)
  lifeStatus?: SubjectLifeStatus;

  @ApiPropertyOptional({ example: '부산', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  localeHint?: string;

  @ApiPropertyOptional({ example: '경상도 사투리', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dialectHint?: string;

  @ApiPropertyOptional({ example: '요리를 좋아하셨음' })
  @IsOptional()
  @IsString()
  notes?: string;
}
