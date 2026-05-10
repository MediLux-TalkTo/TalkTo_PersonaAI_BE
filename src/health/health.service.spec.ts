import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const configService = {
    get: jest.fn().mockReturnValue('test'),
  } as unknown as ConfigService;

  it('returns ok when database query succeeds', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;
    const service = new HealthService(dataSource, configService);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(typeof result.uptime).toBe('number');
    expect(result.app.environment).toBe('test');
  });

  it('throws ServiceUnavailableException when database query fails', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('db down')),
    } as unknown as DataSource;
    const service = new HealthService(dataSource, configService);

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
