import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { success } from '../common/utils/api-response';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { QueryMemoriesDto } from './dto/query-memories.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { MemoriesService } from './memories.service';

@ApiTags('Memories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('memories')
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Get()
  async list(@Query() query: QueryMemoriesDto) {
    return success(await this.memoriesService.list(query));
  }

  @Get(':memoryId')
  async getById(@Param('memoryId') memoryId: string) {
    return success(await this.memoriesService.getById(memoryId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateMemoryDto,
  ) {
    return success(await this.memoriesService.create(user.userId, dto));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':memoryId')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('memoryId') memoryId: string,
    @Body() dto: UpdateMemoryDto,
  ) {
    return success(await this.memoriesService.update(user.userId, memoryId, dto));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':memoryId/deactivate')
  async deactivate(
    @CurrentUser() user: { userId: string },
    @Param('memoryId') memoryId: string,
  ) {
    return success(await this.memoriesService.deactivate(user.userId, memoryId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':memoryId/reembed')
  async reembed(
    @CurrentUser() user: { userId: string },
    @Param('memoryId') memoryId: string,
  ) {
    return success(await this.memoriesService.requestReembed(user.userId, memoryId));
  }
}
