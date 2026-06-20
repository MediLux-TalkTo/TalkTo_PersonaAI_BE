import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import {
  MemoriesSearchResponseDto,
  MemoriesStatusResponseDto,
} from './dto/memories-search-response.dto';
import { MemoriesStatusQueryDto, SearchMemoriesDto } from './dto/memories-search.dto';
import { MemoriesSearchService } from './memories-search.service';

type AuthenticatedUser = {
  readonly userId: string;
};

@ApiTags('Memories')
@ApiBearerAuth()
@Controller('memories')
@UseGuards(JwtAuthGuard)
export class MemoriesSearchController {
  constructor(private readonly memoriesSearchService: MemoriesSearchService) {}

  @Get('status')
  @ApiOperation({ summary: 'Paid Memories search readiness status' })
  @ApiOkResponse({ type: MemoriesStatusResponseDto })
  @ApiCommonErrorResponses()
  async getStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
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
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SearchMemoriesDto,
  ) {
    return success(await this.memoriesSearchService.search(currentUser.userId, dto));
  }
}
