import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { success } from '../common/utils/api-response';
import {
  MemoriesSearchResponseDto,
  MemoriesStatusResponseDto,
} from '../memories-search/dto/memories-search-response.dto';
import {
  MemoriesStatusQueryDto,
  SearchMemoriesDto,
} from '../memories-search/dto/memories-search.dto';
import { MemoriesSearchService } from '../memories-search/memories-search.service';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { MemoryListResponseDto, MemoryResponseDto } from './dto/memory-response.dto';
import { QueryMemoriesDto } from './dto/query-memories.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { MemoriesService } from './memories.service';

@ApiTags('Memories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('memories')
export class MemoriesController {
  constructor(
    private readonly memoriesService: MemoriesService,
    private readonly memoriesSearchService: MemoriesSearchService,
  ) {}

  @Get()
  @ApiOperation({
    summary: '메모리 목록 조회',
    description: '검색어와 필터로 메모리를 조회합니다.',
  })
  @ApiOkResponse({ type: MemoryListResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true })
  async list(@Query() query: QueryMemoriesDto) {
    return success(await this.memoriesService.list(query));
  }

  @Get('status')
  @ApiOperation({ summary: 'Paid Memories search readiness status' })
  @ApiOkResponse({ type: MemoriesStatusResponseDto })
  @ApiCommonErrorResponses()
  async getStatus(
    @CurrentUser() currentUser: { userId: string },
    @Query() query: MemoriesStatusQueryDto,
  ) {
    return success(
      await this.memoriesSearchService.getStatus(currentUser.userId, query),
    );
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search paid Memories over analyzed Archive segments' })
  @ApiBody({ type: SearchMemoriesDto })
  @ApiOkResponse({ type: MemoriesSearchResponseDto })
  @ApiCommonErrorResponses({ forbidden: true })
  async search(
    @CurrentUser() currentUser: { userId: string },
    @Body() dto: SearchMemoriesDto,
  ) {
    return success(
      await this.memoriesSearchService.search(currentUser.userId, dto),
    );
  }

  @Get(':memoryId')
  @ApiOperation({ summary: '메모리 상세 조회' })
  @ApiParam({ name: 'memoryId', example: 'mem-001' })
  @ApiOkResponse({ type: MemoryResponseDto })
  @ApiCommonErrorResponses({
    badRequest: false,
    unauthorized: true,
    notFound: true,
  })
  async getById(@Param('memoryId') memoryId: string) {
    return success(await this.memoriesService.getById(memoryId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: '메모리 생성' })
  @ApiBody({ type: CreateMemoryDto })
  @ApiCreatedResponse({ type: MemoryResponseDto })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
  })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateMemoryDto,
  ) {
    return success(await this.memoriesService.create(user.userId, dto));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':memoryId')
  @ApiOperation({ summary: '메모리 수정' })
  @ApiParam({ name: 'memoryId', example: 'mem-001' })
  @ApiBody({ type: UpdateMemoryDto })
  @ApiOkResponse({ type: MemoryResponseDto })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
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
  @ApiOperation({ summary: '메모리 비활성화' })
  @ApiParam({ name: 'memoryId', example: 'mem-001' })
  @ApiOkResponse({ type: MemoryResponseDto })
  @ApiCommonErrorResponses({
    badRequest: false,
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
  async deactivate(
    @CurrentUser() user: { userId: string },
    @Param('memoryId') memoryId: string,
  ) {
    return success(await this.memoriesService.deactivate(user.userId, memoryId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':memoryId/reembed')
  @ApiOperation({ summary: '메모리 재임베딩 요청' })
  @ApiParam({ name: 'memoryId', example: 'mem-001' })
  @ApiOkResponse({ type: MemoryResponseDto })
  @ApiCommonErrorResponses({
    badRequest: false,
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
  async reembed(
    @CurrentUser() user: { userId: string },
    @Param('memoryId') memoryId: string,
  ) {
    return success(await this.memoriesService.requestReembed(user.userId, memoryId));
  }
}
