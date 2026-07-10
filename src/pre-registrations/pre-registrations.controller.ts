import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
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
import { CreatePreRegistrationDto } from './dto/create-pre-registration.dto';
import { QueryPreRegistrationsDto } from './dto/query-pre-registrations.dto';
import {
  AdminPreRegistrationListResponseDto,
  AdminPreRegistrationResponseDto,
  PreRegistrationSubmissionResponseDto,
} from './dto/pre-registration-response.dto';
import { UpdatePreRegistrationDto } from './dto/update-pre-registration.dto';
import { PreRegistrationsService } from './pre-registrations.service';

type AuthenticatedUser = {
  readonly userId: string;
};

@ApiTags('Pre-registrations')
@Controller()
export class PreRegistrationsController {
  constructor(private readonly preRegistrationsService: PreRegistrationsService) {}

  @Post('pre-registrations')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit a public TalkTo pre-registration' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Optional UUID v4 reused only when retrying the same submission.',
  })
  @ApiBody({ type: CreatePreRegistrationDto })
  @ApiCreatedResponse({ type: PreRegistrationSubmissionResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, unauthorized: false })
  async create(
    @Body() dto: CreatePreRegistrationDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return success(await this.preRegistrationsService.create(dto, idempotencyKey));
  }

  @Get('admin/pre-registrations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OPS)
  @ApiOperation({ summary: 'List pre-registrations for operations' })
  @ApiOkResponse({ type: AdminPreRegistrationListResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, forbidden: true })
  async listForAdmin(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPreRegistrationsDto,
  ) {
    return success(await this.preRegistrationsService.listForAdmin(currentUser.userId, query));
  }

  @Patch('admin/pre-registrations/:registrationId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OPS)
  @ApiOperation({ summary: 'Update pre-registration operations status' })
  @ApiBody({ type: UpdatePreRegistrationDto })
  @ApiOkResponse({ type: AdminPreRegistrationResponseDto })
  @ApiCommonErrorResponses({ badRequest: true, forbidden: true, notFound: true })
  async updateForAdmin(
    @Param('registrationId') registrationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdatePreRegistrationDto,
  ) {
    return success(
      await this.preRegistrationsService.updateForAdmin(
        registrationId,
        currentUser.userId,
        dto,
      ),
    );
  }
}
