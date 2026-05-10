import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../common/swagger/api-meta.dto';
import { UserSummaryDto } from '../../common/swagger/common.dto';

export class TokenPairDto {
  @ApiProperty({ example: 'jwt-access-token' })
  accessToken: string;

  @ApiProperty({ example: 'jwt-refresh-token' })
  refreshToken: string;

  @ApiProperty({ example: '1h' })
  expiresIn: string;
}

export class LoginResponseDataDto extends TokenPairDto {
  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;
}

export class LoginResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: LoginResponseDataDto })
  data: LoginResponseDataDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class RefreshResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: TokenPairDto })
  data: TokenPairDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class CurrentUserResponseDataDto {
  @ApiProperty({ example: 'b2c4b198-54e8-4b42-a521-88fc62f5f455' })
  userId: string;

  @ApiProperty({ example: 'FAMILY' })
  role: string;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email: string | null;
}

export class CurrentUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: CurrentUserResponseDataDto })
  data: CurrentUserResponseDataDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}
