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
import {
  CreateQuestionInteractionDto,
  QuestionCardListResponseDto,
} from './dto/question.dto';
import { QuestionsService } from './questions.service';

@ApiTags('Question Cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('question-cards')
  @ApiOperation({ summary: '오늘의 질문 카드 목록 조회' })
  @ApiOkResponse({ type: QuestionCardListResponseDto })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true })
  async listCards() {
    return success(this.questionsService.listCards());
  }

  @Post('subjects/:subjectId/question-interactions')
  @ApiOperation({ summary: '질문 완료/패스/직접 질문 기록' })
  @ApiParam({ name: 'subjectId', example: 'subject-001' })
  @ApiBody({ type: CreateQuestionInteractionDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 'interaction-001',
          interactionType: 'COMPLETED',
        },
      },
    },
  })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async recordInteraction(
    @CurrentUser() user: { userId: string },
    @Param('subjectId') subjectId: string,
    @Body() dto: CreateQuestionInteractionDto,
  ) {
    return success(
      await this.questionsService.recordInteraction(user.userId, subjectId, dto),
    );
  }
}
