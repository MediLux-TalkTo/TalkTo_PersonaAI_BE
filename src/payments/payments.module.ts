import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisModule } from '../analysis/analysis.module';
import { EventsModule } from '../events/events.module';
import { Order } from '../orders/order.entity';
import { Product } from '../products/product.entity';
import { Entitlement } from './entitlement.entity';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';
import { LocalPaymentProviderService } from './local-payment-provider.service';
import { PaymentEvent } from './payment-event.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Order, Product, PaymentEvent, Entitlement]),
    AnalysisModule,
    EventsModule,
  ],
  controllers: [PaymentsController, EntitlementsController],
  providers: [
    PaymentsService,
    EntitlementsService,
    LocalPaymentProviderService,
  ],
  exports: [LocalPaymentProviderService, EntitlementsService],
})
export class PaymentsModule {}
