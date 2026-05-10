import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { success } from '../common/utils/api-response';
import { QueryErrorLogsDto } from './dto/query-error-logs.dto';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics/overview')
  async getMetricsOverview() {
    return success(await this.adminService.getMetricsOverview());
  }

  @Get('logs/errors')
  async getErrorLogs(@Query() query: QueryErrorLogsDto) {
    return success(await this.adminService.getErrorLogs(query));
  }
}
