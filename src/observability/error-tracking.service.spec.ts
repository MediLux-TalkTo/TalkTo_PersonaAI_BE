import { ConfigService } from '@nestjs/config';
import { ErrorTrackingService } from './error-tracking.service';

describe('ErrorTrackingService', () => {
  it('does not throw when SENTRY_DSN is absent', () => {
    const service = new ErrorTrackingService({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    expect(() => service.onApplicationBootstrap()).not.toThrow();
  });
});
