import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiCommonErrorResponses } from '../common/swagger/error-responses.decorator';
import { success } from '../common/utils/api-response';
import { DataRightsService } from './data-rights.service';
import {
  CreateDataDeletionRequestDto,
  UpdateDataDeletionRequestDto,
  UpdateProviderDeletionRecordDto,
} from './dto/data-deletion.dto';
import { ResearchExportPreviewQueryDto } from './dto/research-export-query.dto';
import {
  ResearchExportPreferenceResponseDto,
  ResearchExportPreviewResponseDto,
} from './dto/research-export-response.dto';

type AuthenticatedUser = {
  readonly userId: string;
};

@ApiTags('Data Rights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DataRightsController {
  constructor(private readonly dataRightsService: DataRightsService) {}

  @Get('data-rights/research-export')
  @ApiOperation({ summary: 'Get current research export opt-in preference' })
  @ApiOkResponse({ type: ResearchExportPreferenceResponseDto })
  @ApiCommonErrorResponses()
  async getResearchExportPreference(@CurrentUser() currentUser: AuthenticatedUser) {
    return success(
      await this.dataRightsService.getResearchExportPreference(
        currentUser.userId,
      ),
    );
  }

  @Post('data-rights/research-export/opt-in')
  @ApiOperation({ summary: 'Opt in to redacted research export eligibility' })
  @ApiCreatedResponse({ type: ResearchExportPreferenceResponseDto })
  @ApiCommonErrorResponses()
  async optInResearchExport(@CurrentUser() currentUser: AuthenticatedUser) {
    return success(
      await this.dataRightsService.optInResearchExport(currentUser.userId),
    );
  }

  @Post('data-rights/research-export/withdraw')
  @ApiOperation({ summary: 'Withdraw research export opt-in' })
  @ApiCreatedResponse({ type: ResearchExportPreferenceResponseDto })
  @ApiCommonErrorResponses()
  async withdrawResearchExport(@CurrentUser() currentUser: AuthenticatedUser) {
    return success(
      await this.dataRightsService.withdrawResearchExport(currentUser.userId),
    );
  }

  @Post('data-deletion-requests')
  @ApiOperation({ summary: 'Create a data deletion request' })
  @ApiCreatedResponse()
  @ApiCommonErrorResponses()
  async createDataDeletionRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateDataDeletionRequestDto,
  ) {
    return success(
      await this.dataRightsService.createDataDeletionRequest(
        currentUser.userId,
        dto,
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OPS)
  @Get('admin/data-rights/research-export-preview')
  @ApiOperation({ summary: 'Preview redacted research export eligible rows' })
  @ApiOkResponse({ type: ResearchExportPreviewResponseDto })
  @ApiCommonErrorResponses({ forbidden: true })
  async previewResearchExport(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ResearchExportPreviewQueryDto,
  ) {
    return success(
      await this.dataRightsService.previewRedactedResearchExport(
        currentUser.userId,
        query,
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OPS)
  @Patch('admin/data-deletion-requests/:requestId')
  @ApiOperation({ summary: 'Update data deletion request status' })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async updateDataDeletionRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateDataDeletionRequestDto,
  ) {
    return success(
      await this.dataRightsService.updateDataDeletionRequest(
        requestId,
        currentUser.userId,
        dto,
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OPS)
  @Patch('admin/provider-deletion-records/:recordId')
  @ApiOperation({ summary: 'Update provider deletion tracking status' })
  @ApiOkResponse()
  @ApiCommonErrorResponses({ forbidden: true, notFound: true })
  async updateProviderDeletionRecord(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateProviderDeletionRecordDto,
  ) {
    return success(
      await this.dataRightsService.updateProviderDeletionRecord(
        recordId,
        currentUser.userId,
        dto,
      ),
    );
  }
}
