import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: '재발급용 refresh token',
    example: 'jwt-refresh-token',
  })
  @IsString()
  refreshToken: string;
}
