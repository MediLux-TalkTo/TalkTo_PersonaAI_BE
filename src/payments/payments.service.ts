import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AnalysisJobsService } from '../analysis/analysis-jobs.service';
import { AppEventsService } from '../events/events.service';
import { OrderPaymentStatus, PaymentProvider } from '../orders/order.constants';
import { Order } from '../orders/order.entity';
import { ProductFeature } from '../products/product.constants';
import { Product } from '../products/product.entity';
import {
  EntitlementStatus,
  PaymentEventType,
} from './payment-event.constants';
import { Entitlement } from './entitlement.entity';
import { PaymentEvent } from './payment-event.entity';
import {
  PaymentWebhookVerificationError,
  VerifiedPaymentEvent,
  verifyLocalPaymentWebhook,
} from './payment-webhook-verifier';

export interface LocalEntitlementMutationPolicy {
  readonly nodeEnv: string;
  readonly provider: PaymentProvider;
}

export interface HandleWebhookInput {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly payload: string;
}

export interface PaymentWebhookResult {
  readonly processed: boolean;
  readonly eventId: string;
  readonly entitlementId?: string;
  readonly analysisJobId?: string;
}

export function assertLocalEntitlementMutationAllowed(
  policy: LocalEntitlementMutationPolicy,
): void {
  if (policy.nodeEnv === 'production' && policy.provider === PaymentProvider.LOCAL) {
    throw new ForbiddenException(
      'Local payment provider cannot mutate entitlements in production.',
    );
  }
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly appEventsService: AppEventsService,
    private readonly analysisJobsService: AnalysisJobsService,
  ) {}

  async handleLocalWebhook(input: HandleWebhookInput): Promise<PaymentWebhookResult> {
    const verifiedEvent = this.verifyLocalWebhook(input);

    return this.dataSource.transaction((manager) =>
      this.persistVerifiedEvent(manager, verifiedEvent),
    );
  }

  private verifyLocalWebhook(input: HandleWebhookInput): VerifiedPaymentEvent {
    try {
      return verifyLocalPaymentWebhook({
        headers: input.headers,
        payload: input.payload,
        secret: this.getWebhookSecret(),
        toleranceSeconds: this.getWebhookToleranceSeconds(),
      });
    } catch (error) {
      if (error instanceof PaymentWebhookVerificationError) {
        throw new BadRequestException({
          code: 'invalid_payment_webhook',
          message: error.message,
        });
      }
      throw error;
    }
  }

  private async persistVerifiedEvent(
    manager: EntityManager,
    event: VerifiedPaymentEvent,
  ): Promise<PaymentWebhookResult> {
    const paymentEvents = manager.getRepository(PaymentEvent);
    const existingEvent = await paymentEvents.findOne({
      where: {
        provider: event.provider,
        providerEventId: event.providerEventId,
      },
    });

    if (existingEvent) {
      throw new ConflictException('Payment webhook replay rejected.');
    }

    const paymentEvent = await paymentEvents.save(
      paymentEvents.create({
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.type,
        orderId: event.orderId,
        payload: event.payload,
      }),
    );

    if (event.type !== PaymentEventType.PAYMENT_SUCCEEDED) {
      paymentEvent.processedAt = new Date();
      await paymentEvents.save(paymentEvent);
      return { processed: true, eventId: paymentEvent.id };
    }

    assertLocalEntitlementMutationAllowed({
      nodeEnv: this.configService.get<string>('NODE_ENV', 'development'),
      provider: event.provider,
    });

    if (!event.orderId) {
      throw new BadRequestException('Payment succeeded event requires orderId.');
    }

    const entitlement = await this.createEntitlementForPaidOrder(
      manager,
      event,
    );
    const analysisJob = await this.createAnalysisJobForPaidEntitlement(
      manager,
      entitlement,
    );

    paymentEvent.processedAt = new Date();
    await paymentEvents.save(paymentEvent);
    await this.appEventsService.emit({
      userId: entitlement.ownerUserId,
      name: 'payment.succeeded',
      orderId: entitlement.orderId,
      payload: {
        provider: event.provider,
        eventType: event.type,
        productId: entitlement.productId,
        feature: entitlement.feature,
        entitlementStatus: entitlement.status,
        hasProviderPaymentId: Boolean(event.paymentId),
      },
    });

    return {
      processed: true,
      eventId: paymentEvent.id,
      entitlementId: entitlement.id,
      analysisJobId: analysisJob?.id,
    };
  }

  private async createEntitlementForPaidOrder(
    manager: EntityManager,
    event: VerifiedPaymentEvent,
  ): Promise<Entitlement> {
    const orders = manager.getRepository(Order);
    const products = manager.getRepository(Product);
    const entitlements = manager.getRepository(Entitlement);
    const order = await orders.findOne({ where: { id: event.orderId } });

    if (!order) {
      throw new NotFoundException('Order not found for payment event.');
    }

    const existingEntitlement = await entitlements.findOne({
      where: { orderId: order.id },
    });

    if (existingEntitlement) {
      return existingEntitlement;
    }

    const product = await products.findOne({ where: { id: order.productId } });

    if (!product) {
      throw new NotFoundException('Product not found for paid order.');
    }

    order.paymentStatus = OrderPaymentStatus.PAID;
    order.providerPaymentId = event.paymentId ?? null;
    order.paidAt = new Date();
    await orders.save(order);

    return entitlements.save(
      entitlements.create({
        ownerUserId: order.ownerUserId,
        productId: product.id,
        orderId: order.id,
        feature: product.feature,
        status: EntitlementStatus.ACTIVE,
        startsAt: new Date(),
      }),
    );
  }

  private async createAnalysisJobForPaidEntitlement(
    manager: EntityManager,
    entitlement: Entitlement,
  ) {
    if (entitlement.feature !== ProductFeature.MEMORIES) {
      return null;
    }

    const orders = manager.getRepository(Order);
    const order = await orders.findOne({ where: { id: entitlement.orderId } });

    if (!order?.targetRecordingId) {
      throw new BadRequestException({
        code: 'target_recording_required',
        message: 'Paid Memories webhook requires a target recording.',
      });
    }

    return this.analysisJobsService.createQueuedForPaidRecording(
      {
        ownerUserId: entitlement.ownerUserId,
        recordingId: order.targetRecordingId,
        orderId: entitlement.orderId,
        entitlementId: entitlement.id,
      },
      manager,
    );
  }

  private getWebhookSecret(): string {
    return this.configService.get<string>(
      'PAYMENT_WEBHOOK_SECRET',
      'local-payment-webhook-secret',
    );
  }

  private getWebhookToleranceSeconds(): number {
    return this.configService.get<number>(
      'PAYMENT_WEBHOOK_TOLERANCE_SECONDS',
      300,
    );
  }
}
