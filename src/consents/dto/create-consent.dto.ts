import { IsBoolean } from 'class-validator';

export class CreateConsentDto {
  @IsBoolean()
  personaDisclaimerAccepted: boolean;

  @IsBoolean()
  conversationStorageAccepted: boolean;

  @IsBoolean()
  voiceSynthesisAccepted: boolean;
}
