import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import { AnalysisJobStatusService } from './analysis-job-status.service';
import { AnalysisJobStatusListResponseDto } from './dto/analysis-job-status-response.dto';
import { QueryAnalysisJobsDto } from './dto/query-analysis-jobs.dto';

type AuthenticatedUser = {
  readonly userId: string;
};

@ApiTags('memories')
@ApiBearerAuth()
@Controller('memories/analysis-jobs')
@UseGuards(JwtAuthGuard)
export class MemoriesAnalysisJobsController {
  constructor(
    private readonly analysisJobStatusService: AnalysisJobStatusService,
  ) {}

  @Get()
  @ApiOperation({ summary: '내 Memories 분석 작업 진행 상태 조회' })
  @ApiOkResponse({ type: AnalysisJobStatusListResponseDto })
  @ApiCommonErrorResponses()
  async listAnalysisJobs(
    @Query() query: QueryAnalysisJobsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return success(
      await this.analysisJobStatusService.listForOwner(currentUser.userId, query),
    );
  }
}
