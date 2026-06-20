import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { success } from '../common/utils/api-response';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

interface AuthenticatedUser {
  readonly userId: string;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return success(
      await this.ordersService.createOrder({
        ownerUserId: currentUser.userId,
        productId: createOrderDto.productId,
        targetRecordingId: createOrderDto.targetRecordingId,
      }),
    );
  }
}
