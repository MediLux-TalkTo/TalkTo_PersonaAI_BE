import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { success } from '../common/utils/api-response';
import { AnalysisJobResponseDto } from './dto/analysis-job-response.dto';
import { AnalysisJobsService } from './analysis-jobs.service';

interface AuthenticatedUser {
  readonly userId: string;
}

@ApiTags('analysis')
@ApiBearerAuth()
@Controller('analysis/jobs')
@UseGuards(JwtAuthGuard)
export class AnalysisJobsController {
  constructor(private readonly analysisJobsService: AnalysisJobsService) {}

  @Post(':jobId/retry')
  @ApiOkResponse({ type: AnalysisJobResponseDto })
  async retryJob(
    @Param('jobId') jobId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const job = await this.analysisJobsService.retryJob(jobId, currentUser.userId);

    return success(this.analysisJobsService.toDto(job));
  }
}
