import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';

export class UserDto {
  @ApiProperty({ example: 'user-001' })
  id: string;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: '01012345678', nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ example: 'FAMILY' })
  role: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '2026-05-10T07:15:00.000Z', nullable: true })
  lastLoginAt: string | null;
}

export class UserListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [UserDto] })
  data: UserDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class InvitedUserResultDto {
  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({
    example: 'tempPass123!',
    nullable: true,
    description: '관리자가 비밀번호를 직접 입력하지 않았을 때만 반환됩니다.',
  })
  temporaryPassword?: string | null;
}

export class InviteUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: InvitedUserResultDto })
  data: InvitedUserResultDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class UserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserDto })
  data: UserDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
