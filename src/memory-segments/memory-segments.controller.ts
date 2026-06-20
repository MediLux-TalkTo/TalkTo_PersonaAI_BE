import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
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
import { CreateMemorySegmentFeedbackDto } from './dto/memory-segment-feedback.dto';
import { CreateMemorySegmentPlaybackDto } from './dto/memory-segment-playback.dto';
import {
  MemorySegmentFeedbackResponseDto,
  MemorySegmentPlaybackResponseDto,
} from './dto/memory-segment-response.dto';
import { MemorySegmentsService } from './memory-segments.service';

type AuthenticatedUser = {
  readonly userId: string;
};

@ApiTags('Memory Segments')
@ApiBearerAuth()
@Controller('memory-segments')
@UseGuards(JwtAuthGuard)
export class MemorySegmentsController {
  constructor(private readonly memorySegmentsService: MemorySegmentsService) {}

  @Post(':memorySegmentId/playback-url')
  @ApiOperation({ summary: 'Issue a segment-scoped playback URL' })
  @ApiParam({ name: 'memorySegmentId' })
  @ApiBody({ type: CreateMemorySegmentPlaybackDto, required: false })
  @ApiOkResponse({ type: MemorySegmentPlaybackResponseDto })
  @ApiCommonErrorResponses()
  async createPlaybackUrl(
    @Param('memorySegmentId') memorySegmentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateMemorySegmentPlaybackDto,
  ) {
    return success(
      await this.memorySegmentsService.createPlaybackUrl(
        memorySegmentId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @Post(':memorySegmentId/feedback')
  @ApiOperation({ summary: 'Submit feedback for a Memories segment result' })
  @ApiParam({ name: 'memorySegmentId' })
  @ApiBody({ type: CreateMemorySegmentFeedbackDto })
  @ApiCreatedResponse({ type: MemorySegmentFeedbackResponseDto })
  @ApiCommonErrorResponses()
  async createFeedback(
    @Param('memorySegmentId') memorySegmentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateMemorySegmentFeedbackDto,
  ) {
    return success(
      await this.memorySegmentsService.createFeedback(
        memorySegmentId,
        currentUser.userId,
        dto,
      ),
    );
  }
}
