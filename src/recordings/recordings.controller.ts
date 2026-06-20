import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import { CompleteRecordingUploadDto } from './dto/complete-recording-upload.dto';
import { CreateRecordingUploadIntentDto } from './dto/create-upload-intent.dto';
import {
  RecordingListResponseDto,
  RecordingPlaybackUrlDto,
  RecordingResponseDto,
  RecordingUploadGuideResponseDto,
  RecordingUploadIntentResponseDto,
  RecordingUploadIntentStateResponseDto,
} from './dto/recording-response.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import { RecordingsService } from './recordings.service';

@ApiTags('Recordings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Get('upload-guide')
  @ApiOperation({ summary: '녹음 업로드 가이드 조회' })
  @ApiOkResponse({ type: RecordingUploadGuideResponseDto })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true, notFound: false })
  getUploadGuide() {
    return success(this.recordingsService.getUploadGuide());
  }

  @Post('recordings/upload-intent')
  @ApiOperation({ summary: '녹음 파일 업로드 intent 생성' })
  @ApiBody({ type: CreateRecordingUploadIntentDto })
  @ApiCreatedResponse({ type: RecordingUploadIntentResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async createUploadIntent(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateRecordingUploadIntentDto,
  ) {
    return success(
      await this.recordingsService.createUploadIntent(user.userId, dto),
    );
  }

  @Post('recordings/:recordingId/upload-intents/:uploadIntentId/retry')
  @ApiOperation({ summary: '실패/취소/만료된 녹음 업로드 intent 재시도' })
  @ApiParam({ name: 'recordingId', example: 'recording-001' })
  @ApiParam({ name: 'uploadIntentId', example: 'upload-intent-001' })
  @ApiOkResponse({ type: RecordingUploadIntentResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  @HttpCode(HttpStatus.OK)
  async retryUploadIntent(
    @Param('recordingId') recordingId: string,
    @Param('uploadIntentId') uploadIntentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return success(
      await this.recordingsService.retryUploadIntent(
        recordingId,
        user.userId,
        uploadIntentId,
      ),
    );
  }

  @Post('recordings/:recordingId/upload-intents/:uploadIntentId/cancel')
  @ApiOperation({ summary: '진행 중인 녹음 업로드 intent 취소' })
  @ApiParam({ name: 'recordingId', example: 'recording-001' })
  @ApiParam({ name: 'uploadIntentId', example: 'upload-intent-001' })
  @ApiOkResponse({ type: RecordingUploadIntentStateResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async cancelUploadIntent(
    @Param('recordingId') recordingId: string,
    @Param('uploadIntentId') uploadIntentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return success(
      await this.recordingsService.cancelUploadIntent(
        recordingId,
        user.userId,
        uploadIntentId,
      ),
    );
  }

  @Post('recordings/:recordingId/complete')
  @ApiOperation({ summary: '녹음 파일 업로드 완료 콜백' })
  @ApiParam({ name: 'recordingId', example: 'recording-001' })
  @ApiBody({ type: CompleteRecordingUploadDto })
  @ApiOkResponse({ type: RecordingResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async completeUpload(
    @Param('recordingId') recordingId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CompleteRecordingUploadDto,
  ) {
    return success(
      await this.recordingsService.completeUpload(recordingId, user.userId, dto),
    );
  }

  @Get('subjects/:subjectId/recordings')
  @ApiOperation({ summary: '대상자별 녹음 보관함 목록 조회' })
  @ApiParam({ name: 'subjectId', example: 'subject-001' })
  @ApiOkResponse({ type: RecordingListResponseDto })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true, notFound: true })
  async listBySubject(
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return success(
      await this.recordingsService.listBySubject(subjectId, user.userId),
    );
  }

  @Get('recordings/:recordingId')
  @ApiOperation({ summary: '녹음 상세 조회' })
  @ApiParam({ name: 'recordingId', example: 'recording-001' })
  @ApiOkResponse({ type: RecordingResponseDto })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true, notFound: true })
  async get(
    @Param('recordingId') recordingId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return success(await this.recordingsService.getOwned(recordingId, user.userId));
  }

  @Patch('recordings/:recordingId')
  @ApiOperation({ summary: '녹음 메모와 연결 질문 수정' })
  @ApiParam({ name: 'recordingId', example: 'recording-001' })
  @ApiBody({ type: UpdateRecordingDto })
  @ApiOkResponse({ type: RecordingResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async update(
    @Param('recordingId') recordingId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateRecordingDto,
  ) {
    return success(
      await this.recordingsService.update(recordingId, user.userId, dto),
    );
  }

  @Delete('recordings/:recordingId')
  @ApiOperation({ summary: '녹음 삭제 요청' })
  @ApiParam({ name: 'recordingId', example: 'recording-001' })
  @ApiOkResponse({ type: RecordingResponseDto })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true, notFound: true })
  async requestDeletion(
    @Param('recordingId') recordingId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return success(
      await this.recordingsService.requestDeletion(recordingId, user.userId),
    );
  }

  @Post('recordings/:recordingId/preview-analysis')
  @ApiOperation({ summary: 'Preview 분석 요청 - v1.0 비활성화' })
  @ApiParam({ name: 'recordingId', example: 'recording-001' })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Preview 분석은 v1.0에서 비활성화됨',
  })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true, notFound: false })
  async requestPreviewAnalysis(
    @Param('recordingId') recordingId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return success(
      await this.recordingsService.requestPreviewAnalysis(
        recordingId,
        user.userId,
      ),
    );
  }

  @Post('recordings/:recordingId/playback-url')
  @ApiOperation({ summary: '원본 녹음 재생 signed URL 발급' })
  @ApiParam({ name: 'recordingId', example: 'recording-001' })
  @ApiOkResponse({ type: RecordingPlaybackUrlDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async createPlaybackUrl(
    @Param('recordingId') recordingId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return success(
      await this.recordingsService.createPlaybackUrl(recordingId, user.userId),
    );
  }
}
