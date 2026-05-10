import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePersonaDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
