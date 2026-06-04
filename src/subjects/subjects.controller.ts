import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { CreateSubjectDto } from './dto/create-subject.dto';
import {
  SubjectListResponseDto,
  SubjectResponseDto,
} from './dto/subject-response.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UpsertGlossaryTermDto } from './dto/upsert-glossary-term.dto';
import { SubjectsService } from './subjects.service';

@ApiTags('Subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @ApiOperation({ summary: '대상자 프로필 생성' })
  @ApiBody({ type: CreateSubjectDto })
  @ApiCreatedResponse({ type: SubjectResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSubjectDto,
  ) {
    return success(await this.subjectsService.create(user.userId, dto));
  }

  @Get()
  @ApiOperation({ summary: '내 대상자 목록 조회' })
  @ApiOkResponse({ type: SubjectListResponseDto })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true })
  async list(@CurrentUser() user: { userId: string }) {
    return success(await this.subjectsService.list(user.userId));
  }

  @Get(':subjectId')
  @ApiOperation({ summary: '대상자 상세 조회' })
  @ApiParam({ name: 'subjectId', example: 'subject-001' })
  @ApiOkResponse({ type: SubjectResponseDto })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true, notFound: true })
  async get(
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return success(await this.subjectsService.getOwned(subjectId, user.userId));
  }

  @Patch(':subjectId')
  @ApiOperation({ summary: '대상자 프로필 수정' })
  @ApiParam({ name: 'subjectId', example: 'subject-001' })
  @ApiBody({ type: UpdateSubjectDto })
  @ApiOkResponse({ type: SubjectResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async update(
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateSubjectDto,
  ) {
    return success(await this.subjectsService.update(subjectId, user.userId, dto));
  }

  @Post(':subjectId/glossary')
  @ApiOperation({ summary: '가족 고유명사 사전 항목 추가' })
  @ApiParam({ name: 'subjectId', example: 'subject-001' })
  @ApiBody({ type: UpsertGlossaryTermDto })
  @ApiCreatedResponse({ type: SubjectResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async addGlossaryTerm(
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpsertGlossaryTermDto,
  ) {
    return success(
      await this.subjectsService.addGlossaryTerm(subjectId, user.userId, dto),
    );
  }

  @Delete(':subjectId/glossary/:termId')
  @ApiOperation({ summary: '가족 고유명사 사전 항목 삭제' })
  @ApiParam({ name: 'subjectId', example: 'subject-001' })
  @ApiParam({ name: 'termId', example: 'term-001' })
  @ApiOkResponse({ schema: { example: { success: true, data: { deleted: true } } } })
  @ApiCommonErrorResponses({ badRequest: false, unauthorized: true, notFound: true })
  async removeGlossaryTerm(
    @Param('subjectId') subjectId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return success(
      await this.subjectsService.removeGlossaryTerm(subjectId, termId, user.userId),
    );
  }
}
