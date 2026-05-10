import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class CreateConsentDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  personaDisclaimerAccepted: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  conversationStorageAccepted: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  voiceSynthesisAccepted: boolean;
}
