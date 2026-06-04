import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import { CompleteRecordingUploadDto } from './dto/complete-recording-upload.dto';
import { CreateRecordingUploadIntentDto } from './dto/create-upload-intent.dto';
import {
  RecordingListResponseDto,
  RecordingPlaybackUrlDto,
  RecordingResponseDto,
  RecordingUploadIntentResponseDto,
} from './dto/recording-response.dto';
import { RecordingsService } from './recordings.service';

@ApiTags('Recordings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

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
