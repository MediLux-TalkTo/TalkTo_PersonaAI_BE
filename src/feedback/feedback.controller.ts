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
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { success } from '../common/utils/api-response';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackListResponseDto, FeedbackResponseDto } from './dto/feedback-response.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('messages/:messageId/feedback')
  @ApiOperation({
    summary: '응답 피드백 저장',
    description: 'assistant 메시지별 좋아요/싫어요와 태그, 코멘트를 저장합니다.',
  })
  @ApiParam({ name: 'messageId', example: 'msg-001' })
  @ApiBody({ type: CreateFeedbackDto })
  @ApiCreatedResponse({ type: FeedbackResponseDto })
  async create(
    @Param('messageId') messageId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateFeedbackDto,
  ) {
    return success(await this.feedbackService.create(messageId, user.userId, dto));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/feedback')
  @ApiOperation({ summary: '피드백 목록 조회' })
  @ApiOkResponse({ type: FeedbackListResponseDto })
  async list() {
    return success(await this.feedbackService.list());
  }
}
