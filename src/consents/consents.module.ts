import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consent } from './consent.entity';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Consent])],
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
