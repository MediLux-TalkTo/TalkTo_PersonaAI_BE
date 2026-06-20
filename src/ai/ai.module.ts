import { Module } from '@nestjs/common';
import { ConsentsModule } from '../consents/consents.module';
import { MaskingModule } from '../masking/masking.module';
import { AiClientService } from './ai-client.service';
import { ProviderCallGatewayService } from './provider-call-gateway.service';

@Module({
  imports: [ConsentsModule, MaskingModule],
  providers: [AiClientService, ProviderCallGatewayService],
  exports: [AiClientService],
})
export class AiModule {}
