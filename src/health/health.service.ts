import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

const packageMetadata = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
) as {
  name: string;
  version: string;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async check() {
    const timestamp = new Date().toISOString();

    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        timestamp,
        app: this.getAppMetadata(),
      });
    }

    return {
      status: 'ok',
      database: 'up',
      timestamp,
      uptime: process.uptime(),
      app: this.getAppMetadata(),
    };
  }

  private getAppMetadata() {
    return {
      name: packageMetadata.name,
      version: packageMetadata.version,
      environment:
        this.configService.get<string>('NODE_ENV') ?? 'development',
    };
  }
}
