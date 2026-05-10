import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class InviteUserDto {
  @ApiProperty({ example: '홍길동' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '01012345678' })
  @IsOptional()
  @Matches(/^[0-9+-]{8,20}$/)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'TempPass123!', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.FAMILY })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
