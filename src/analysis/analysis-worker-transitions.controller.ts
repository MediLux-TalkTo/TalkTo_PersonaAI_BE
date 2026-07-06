import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { success } from '../common/utils/api-response';
import { AnalysisAiTranscriptionService } from './analysis-ai-transcription.service';
import { AnalysisWorkerTransitionsService } from './analysis-worker-transitions.service';
import { AnalysisJobResponseDto } from './dto/analysis-job-response.dto';
import {
  MarkFailedDto,
  MarkIndexingDto,
  MarkSegmentingDto,
  MarkSttDto,
  RequestAiTranscriptionDto,
  WorkerTransitionDto,
} from './dto/worker-transition.dto';

@ApiTags('Admin Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/analysis/jobs')
export class AnalysisWorkerTransitionsController {
  constructor(
    private readonly workerTransitionsService: AnalysisWorkerTransitionsService,
    private readonly aiTranscriptionService: AnalysisAiTranscriptionService,
  ) {}

  @Patch(':jobId/transitions/preprocess')
  @ApiOperation({ summary: 'Mark paid analysis preprocessing' })
  @ApiBody({ type: WorkerTransitionDto })
  @ApiOkResponse({ type: AnalysisJobResponseDto })
  async markPreprocessing(
    @Param('jobId') jobId: string,
    @Body() dto: WorkerTransitionDto,
  ) {
    return success(
      this.workerTransitionsService.toDto(
        await this.workerTransitionsService.markPreprocessing(jobId, dto),
      ),
    );
  }

  @Patch(':jobId/transitions/stt')
  @ApiOperation({ summary: 'Mark paid analysis STT and persist transcript segments' })
  @ApiBody({ type: MarkSttDto })
  @ApiOkResponse({ type: AnalysisJobResponseDto })
  async markStt(@Param('jobId') jobId: string, @Body() dto: MarkSttDto) {
    return success(
      this.workerTransitionsService.toDto(
        await this.workerTransitionsService.markStt(jobId, dto),
      ),
    );
  }

  @Post(':jobId/provider/transcription')
  @ApiOperation({
    summary: 'Request AI transcription and persist returned transcript segments',
  })
  @ApiBody({ type: RequestAiTranscriptionDto })
  @ApiOkResponse({ type: AnalysisJobResponseDto })
  async requestProviderTranscription(
    @Param('jobId') jobId: string,
    @Body() dto: RequestAiTranscriptionDto,
  ) {
    return success(
      this.workerTransitionsService.toDto(
        await this.aiTranscriptionService.requestAndPersistTranscription(
          jobId,
          dto.mode ?? 'full',
        ),
      ),
    );
  }

  @Patch(':jobId/transitions/redaction')
  @ApiOperation({ summary: 'Mark paid analysis redaction gate' })
  @ApiOkResponse({ type: AnalysisJobResponseDto })
  async markRedaction(@Param('jobId') jobId: string) {
    return success(
      this.workerTransitionsService.toDto(
        await this.workerTransitionsService.markRedaction(jobId),
      ),
    );
  }

  @Patch(':jobId/transitions/segmenting')
  @ApiOperation({ summary: 'Mark paid analysis segmenting and persist memory segments' })
  @ApiBody({ type: MarkSegmentingDto })
  @ApiOkResponse({ type: AnalysisJobResponseDto })
  async markSegmenting(
    @Param('jobId') jobId: string,
    @Body() dto: MarkSegmentingDto,
  ) {
    return success(
      this.workerTransitionsService.toDto(
        await this.workerTransitionsService.markSegmenting(jobId, dto),
      ),
    );
  }

  @Patch(':jobId/transitions/indexing')
  @ApiOperation({ summary: 'Mark paid analysis indexing and persist embeddings' })
  @ApiBody({ type: MarkIndexingDto })
  @ApiOkResponse({ type: AnalysisJobResponseDto })
  async markIndexing(@Param('jobId') jobId: string, @Body() dto: MarkIndexingDto) {
    return success(
      this.workerTransitionsService.toDto(
        await this.workerTransitionsService.markIndexing(jobId, dto),
      ),
    );
  }

  @Patch(':jobId/transitions/completed')
  @ApiOperation({ summary: 'Mark paid analysis completed' })
  @ApiOkResponse({ type: AnalysisJobResponseDto })
  async markCompleted(@Param('jobId') jobId: string) {
    return success(
      this.workerTransitionsService.toDto(
        await this.workerTransitionsService.markCompleted(jobId),
      ),
    );
  }

  @Patch(':jobId/transitions/failed')
  @ApiOperation({ summary: 'Mark paid analysis failed' })
  @ApiBody({ type: MarkFailedDto })
  @ApiOkResponse({ type: AnalysisJobResponseDto })
  async markFailed(@Param('jobId') jobId: string, @Body() dto: MarkFailedDto) {
    return success(
      this.workerTransitionsService.toDto(
        await this.workerTransitionsService.markFailed(jobId, dto),
      ),
    );
  }
}
