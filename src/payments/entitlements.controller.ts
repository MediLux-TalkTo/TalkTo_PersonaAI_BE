import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { success } from '../common/utils/api-response';
import { EntitlementsService } from './entitlements.service';

interface AuthenticatedUser {
  readonly userId: string;
}

@Controller('entitlements')
@UseGuards(JwtAuthGuard)
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get()
  async listEntitlements(@CurrentUser() currentUser: AuthenticatedUser) {
    return success(
      await this.entitlementsService.listActiveForUser(currentUser.userId),
    );
  }
}
