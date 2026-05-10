import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok when database query succeeds', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;
    const service = new HealthService(dataSource);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(typeof result.uptime).toBe('number');
  });

  it('throws ServiceUnavailableException when database query fails', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('db down')),
    } as unknown as DataSource;
    const service = new HealthService(dataSource);

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
