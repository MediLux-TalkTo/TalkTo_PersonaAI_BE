import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ErrorTrackingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ErrorTrackingService.name);

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    const dsn = this.configService.get<string>('SENTRY_DSN')?.trim();

    if (!dsn) {
      return;
    }

    this.logger.log('External error tracking is configured.');
  }
}
