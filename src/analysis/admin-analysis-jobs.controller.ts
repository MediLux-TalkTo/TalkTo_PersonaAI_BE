import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import { AnalysisJobStatusService } from './analysis-job-status.service';
import {
  AnalysisJobStatusListResponseDto,
  AnalysisJobStatusResponseDto,
} from './dto/analysis-job-status-response.dto';
import { QueryAnalysisJobsDto } from './dto/query-analysis-jobs.dto';

type AdminAnalysisUser = {
  readonly userId: string;
  readonly role: Role;
};

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/analysis-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.OPS)
export class AdminAnalysisJobsController {
  constructor(
    private readonly analysisJobStatusService: AnalysisJobStatusService,
  ) {}

  @Get()
  @ApiOperation({ summary: '관리자 분석 작업 진행 상태 조회' })
  @ApiOkResponse({ type: AnalysisJobStatusListResponseDto })
  @ApiCommonErrorResponses({ forbidden: true })
  async listAnalysisJobs(@Query() query: QueryAnalysisJobsDto) {
    return success(await this.analysisJobStatusService.listForAdmin(query));
  }

  @Post(':jobId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '관리자 분석 작업 재시도' })
  @ApiParam({
    name: 'jobId',
    example: '8a1c6f1d-0e23-4db9-aabc-c0d066010001',
  })
  @ApiOkResponse({ type: AnalysisJobStatusResponseDto })
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async retryAnalysisJob(
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @CurrentUser() currentUser: AdminAnalysisUser,
  ) {
    return success(
      await this.analysisJobStatusService.adminRetryJob(jobId, currentUser),
    );
  }
}
