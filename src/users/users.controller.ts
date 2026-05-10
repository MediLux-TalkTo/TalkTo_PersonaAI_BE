import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { success } from '../common/utils/api-response';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  InviteUserResponseDto,
  UserListResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '사용자 목록 조회' })
  @ApiOkResponse({ type: UserListResponseDto })
  async list() {
    return success(await this.usersService.list());
  }

  @Post('invitations')
  @ApiOperation({ summary: '가족 사용자 초대' })
  @ApiBody({ type: InviteUserDto })
  @ApiCreatedResponse({ type: InviteUserResponseDto })
  async invite(@Body() dto: InviteUserDto) {
    return success(await this.usersService.invite(dto));
  }

  @Patch(':userId')
  @ApiOperation({ summary: '사용자 role/status 수정' })
  @ApiParam({ name: 'userId', example: 'user-001' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: UserResponseDto })
  async update(@Param('userId') userId: string, @Body() dto: UpdateUserDto) {
    return success(await this.usersService.update(userId, dto));
  }
}
