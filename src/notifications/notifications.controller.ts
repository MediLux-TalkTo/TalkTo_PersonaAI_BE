import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
  NotificationResponseDto,
  NotificationsResponseDto,
} from './dto/notification-response.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

type AuthenticatedUser = {
  readonly userId: string;
};

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List current user notifications' })
  @ApiOkResponse({ type: NotificationsResponseDto })
  @ApiCommonErrorResponses()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return success(
      await this.notificationsService.listForUser(currentUser.userId, query),
    );
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'notificationId' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiCommonErrorResponses()
  async markRead(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('notificationId') notificationId: string,
  ) {
    return success(
      await this.notificationsService.markRead(
        currentUser.userId,
        notificationId,
      ),
    );
  }
}
