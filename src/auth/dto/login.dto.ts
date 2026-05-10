import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: '이메일 또는 전화번호',
    example: 'user@example.com',
  })
  @IsString()
  identifier: string;

  @ApiProperty({
    description: '로그인 비밀번호',
    example: 'Admin1234!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
