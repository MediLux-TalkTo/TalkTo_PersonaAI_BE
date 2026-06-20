import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';
import {
  GlossaryTermType,
  SubjectAvatarType,
  SubjectLifeStatus,
  SubjectReadinessStatus,
} from '../../common/enums/archive.enums';

export class FamilyGlossaryTermDto {
  @ApiProperty({ example: 'term-001' })
  id: string;

  @ApiProperty({ enum: GlossaryTermType, example: GlossaryTermType.PERSON })
  termType: GlossaryTermType;

  @ApiProperty({ example: '찬민' })
  term: string;

  @ApiProperty({ example: '찬미니', nullable: true })
  pronunciationHint: string | null;

  @ApiProperty({ example: '손자 이름', nullable: true })
  meaning: string | null;
}

export class SubjectDto {
  @ApiProperty({ example: 'subject-001' })
  id: string;

  @ApiProperty({ example: '할머니' })
  displayName: string;

  @ApiProperty({ example: 'grandmother' })
  relationship: string;

  @ApiProperty({ example: '할머니' })
  relationshipLabel: string;

  @ApiProperty({ enum: SubjectLifeStatus, example: SubjectLifeStatus.LIVING })
  lifeStatus: SubjectLifeStatus;

  @ApiProperty({ example: '부산', nullable: true })
  localeHint: string | null;

  @ApiProperty({ example: '경상도 사투리', nullable: true })
  dialectHint: string | null;

  @ApiProperty({ example: '부산 · 경상도 사투리', nullable: true })
  regionText: string | null;

  @ApiProperty({ example: '요리를 좋아하셨음', nullable: true })
  notes: string | null;

  @ApiProperty({ enum: SubjectAvatarType, example: SubjectAvatarType.DEFAULT })
  avatarType: string;

  @ApiProperty({ example: 2 })
  recordingCount: number;

  @ApiProperty({ example: 184 })
  recordingSeconds: number;

  @ApiProperty({
    enum: SubjectReadinessStatus,
    example: SubjectReadinessStatus.NOT_STARTED,
  })
  memoriesStatus: string;

  @ApiProperty({
    enum: SubjectReadinessStatus,
    example: SubjectReadinessStatus.NOT_STARTED,
  })
  personaStatus: string;

  @ApiProperty({ type: [FamilyGlossaryTermDto] })
  glossaryTerms?: FamilyGlossaryTermDto[];
}

export class SubjectResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: SubjectDto })
  data: SubjectDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class SubjectListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [SubjectDto] })
  data: SubjectDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
