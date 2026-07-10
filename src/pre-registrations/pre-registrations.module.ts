import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PreRegistration } from './pre-registration.entity';
import { PreRegistrationsController } from './pre-registrations.controller';
import { PreRegistrationsService } from './pre-registrations.service';

@Module({
  imports: [TypeOrmModule.forFeature([PreRegistration]), AuditModule],
  controllers: [PreRegistrationsController],
  providers: [PreRegistrationsService],
})
export class PreRegistrationsModule {}
