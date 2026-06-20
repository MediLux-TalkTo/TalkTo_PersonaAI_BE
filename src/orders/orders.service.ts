import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentFeature } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { LocalPaymentProviderService } from '../payments/local-payment-provider.service';
import { ProductFeature } from '../products/product.constants';
import { ProductsService } from '../products/products.service';
import { OrderPaymentStatus, PaymentProvider } from './order.constants';
import { Order } from './order.entity';

export interface CreatedOrderCheckout {
  readonly order: Order;
  readonly checkout: {
    readonly provider: PaymentProvider;
    readonly checkoutId: string;
    readonly paymentUrl: string;
  };
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly productsService: ProductsService,
    private readonly localPaymentProvider: LocalPaymentProviderService,
    private readonly consentsService: ConsentsService,
    private readonly appEventsService: AppEventsService,
  ) {}

  async createOrder(input: {
    readonly ownerUserId: string;
    readonly productId: string;
    readonly targetRecordingId?: string;
  }): Promise<CreatedOrderCheckout> {
    const product = await this.productsService.findActiveById(input.productId);
    if (product.feature === ProductFeature.MEMORIES && !input.targetRecordingId) {
      throw new BadRequestException({
        code: 'target_recording_required',
        message: 'Memories analysis orders require a target recording.',
      });
    }
    await this.consentsService.assertRequiredConsents(
      input.ownerUserId,
      this.consentFeatureForProduct(product.feature),
    );
    const order = this.ordersRepository.create({
      ownerUserId: input.ownerUserId,
      productId: product.id,
      paymentProvider: PaymentProvider.LOCAL,
      paymentStatus: OrderPaymentStatus.PENDING,
      amountCents: product.amountCents,
      currency: product.currency,
      targetRecordingId: input.targetRecordingId ?? null,
    });
    const savedOrder = await this.ordersRepository.save(order);
    const checkout = this.localPaymentProvider.createCheckoutSession(savedOrder);

    savedOrder.providerCheckoutId = checkout.checkoutId;
    const orderWithCheckout = await this.ordersRepository.save(savedOrder);
    await this.appEventsService.emit({
      userId: input.ownerUserId,
      name: 'order.created',
      orderId: orderWithCheckout.id,
      payload: {
        productId: product.id,
        productFeature: product.feature,
        paymentProvider: orderWithCheckout.paymentProvider,
        paymentStatus: orderWithCheckout.paymentStatus,
        amountCents: orderWithCheckout.amountCents,
        currency: orderWithCheckout.currency,
        hasTargetRecording: Boolean(orderWithCheckout.targetRecordingId),
      },
    });

    return {
      order: orderWithCheckout,
      checkout,
    };
  }

  private consentFeatureForProduct(feature: ProductFeature): ConsentFeature {
    switch (feature) {
      case ProductFeature.MEMORIES:
        return ConsentFeature.MEMORIES;
      case ProductFeature.VOICE_PERSONA:
        return ConsentFeature.VOICE_PERSONA;
    }
  }
}
