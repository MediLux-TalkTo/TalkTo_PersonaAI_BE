import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePersonaRuntimeSessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  applicationId: string;
}

export class CreatePersonaRuntimeMessageDto {
  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  text: string;
}
