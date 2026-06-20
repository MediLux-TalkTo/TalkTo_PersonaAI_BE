import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { success } from '../common/utils/api-response';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('local/webhook')
  @HttpCode(200)
  async handleLocalWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Payment webhook raw body is required.');
    }

    return success(
      await this.paymentsService.handleLocalWebhook({
        headers,
        payload: request.rawBody.toString('utf8'),
      }),
    );
  }
}
