import { Module } from '@nestjs/common';
import { ErrorTrackingService } from './error-tracking.service';

@Module({
  providers: [ErrorTrackingService],
})
export class ObservabilityModule {}
