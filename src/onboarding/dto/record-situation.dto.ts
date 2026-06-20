import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  OnboardingSituation,
  type OnboardingSituationValue,
  onboardingSituationValues,
} from '../../common/enums/archive.enums';

export class RecordSituationDto {
  @ApiProperty({
    enum: OnboardingSituation,
    example: OnboardingSituation.LIVING,
  })
  @IsIn(onboardingSituationValues)
  situation: OnboardingSituationValue;
}
