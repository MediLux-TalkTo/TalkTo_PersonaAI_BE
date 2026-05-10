import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class PersonaDto {
  @ApiProperty({ example: 'persona-grandma-001' })
  id: string;

  @ApiProperty({ example: '우리 할머니' })
  displayName: string;

  @ApiProperty({ example: '따뜻하고 안정적으로 응답하는 기본 페르소나' })
  description: string;

  @ApiProperty({ example: null, nullable: true })
  profileImageUrl: string | null;

  @ApiProperty({ example: 'default-voice' })
  voiceId: string;

  @ApiProperty({ example: 'gpt-4.1-mini' })
  modelId: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class PersonaResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: PersonaDto })
  data: PersonaDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
