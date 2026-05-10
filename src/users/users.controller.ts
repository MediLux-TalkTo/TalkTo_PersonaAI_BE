import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { success } from '../common/utils/api-response';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list() {
    return success(await this.usersService.list());
  }

  @Post('invitations')
  async invite(@Body() dto: InviteUserDto) {
    return success(await this.usersService.invite(dto));
  }

  @Patch(':userId')
  async update(@Param('userId') userId: string, @Body() dto: UpdateUserDto) {
    return success(await this.usersService.update(userId, dto));
  }
}
