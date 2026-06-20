import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';
import {
  OnboardingSituation,
  type OnboardingSituationValue,
} from '../../common/enums/archive.enums';

export class OnboardingSituationDto {
  @ApiProperty({ example: 'event-001' })
  id: string;

  @ApiProperty({
    enum: OnboardingSituation,
    example: OnboardingSituation.VOICE_PERSONA_INTEREST,
  })
  situation: OnboardingSituationValue;

  @ApiProperty({ example: '/subjects/new?lifeStatus=LIVING' })
  nextRoute: string;

  @ApiProperty({ example: '2026-06-17T00:00:00.000Z' })
  createdAt: Date;
}

export class OnboardingSituationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: OnboardingSituationDto })
  data: OnboardingSituationDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
